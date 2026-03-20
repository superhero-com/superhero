/* eslint-disable */
import waeACI from 'dex-contracts-v2/deployment/aci/WAE.aci.json';
import { useRef, useState } from 'react';
import { type ContractMethodsBase } from '@aeternity/aepp-sdk';
import { useAeSdk, useRecentActivities } from '../../../hooks';
import { Decimal } from '../../../libs/decimal';
import {
  addSlippage,
  DEX_ADDRESSES,
  ensureAllowanceForRouter,
  fromAettos,
  getRouterTokenAllowance,
  initDexContracts,
  subSlippage,
  toAettos,
} from '../../../libs/dex';
import { initializeContractTyped } from '../../../libs/initializeContractTyped';
import { errorToUserMessage } from '../../../libs/errorMessages';
import { TxPayloadType, useTransactionNotification } from '../../../features/transaction-notification/transaction-notification.context';
import { SwapExecutionParams } from '../types/dex';

type WaeContractApi = ContractMethodsBase & {
  deposit: (options: { amount: any }) => Promise<{ hash?: string }>;
  withdraw: (amount: any, referrer: null) => Promise<{ hash?: string }>;
};

function extractAeTxHash(txResult: any): string {
  const candidates = [
    txResult?.tx?.hash,
    txResult?.transactionHash,
    txResult?.hash,
  ]
    .map((value) => (typeof value === 'string' ? value : ''))
    .filter(Boolean);

  return candidates.find((value) => value.startsWith('th_')) || candidates[0] || '';
}

export function useSwapExecution() {
  const { sdk, activeAccount } = useAeSdk();
  const { addActivity } = useRecentActivities();
  const { notifySubmitted, notifyPendingTx, notifyConfirmed, notifyError } = useTransactionNotification();

  const [loading, setLoading] = useState(false);
  const [allowanceInfo, setAllowanceInfo] = useState<string | null>(null);
  const [swapStep, setSwapStep] = useState<{ current: number; total: number; label: string } | null>(null);
  const needsApprovalInCurrentSwap = useRef(false);

  function isAeToWae(tokenIn: any, tokenOut: any): boolean {
    const isAetoWae = tokenIn.address == 'AE' && tokenOut.address == DEX_ADDRESSES.wae;
    const isWaeToAe = tokenIn.address == DEX_ADDRESSES.wae && tokenOut.address == 'AE';
    return isAetoWae || isWaeToAe;
  }

  async function wrapAeToWae(amountAe: string): Promise<string | null> {
    const wae = await initializeContractTyped<WaeContractApi>(
      sdk,
      { aci: waeACI, address: DEX_ADDRESSES.wae },
    );
    const aettos = Decimal.from(amountAe).bigNumber;

    notifySubmitted({ type: TxPayloadType.WrapToken, amount: amountAe });

    const result = await wae.deposit({ amount: aettos });
    const txHash = extractAeTxHash(result);

    if (!txHash) {
      throw new Error('Transaction failed - no hash returned');
    }

    if (activeAccount) {
      addActivity({
        type: 'wrap',
        hash: txHash,
        account: activeAccount,
        tokenIn: 'AE',
        tokenOut: 'WAE',
        amountIn: amountAe,
        amountOut: amountAe,
      });
    }
    notifyPendingTx({ type: TxPayloadType.WrapToken, amount: amountAe }, txHash);

    return txHash;
  }

  async function unwrapWaeToAe(amountWae: string): Promise<string | null> {
    const wae = await initializeContractTyped<WaeContractApi>(
      sdk,
      { aci: waeACI, address: DEX_ADDRESSES.wae },
    );
    const aettos = Decimal.from(amountWae).bigNumber;

    notifySubmitted({ type: TxPayloadType.UnwrapToken, amount: amountWae });

    const result = await wae.withdraw(aettos, null);
    const txHash = extractAeTxHash(result);

    if (!txHash) {
      throw new Error('Transaction failed - no hash returned');
    }

    if (activeAccount) {
      addActivity({
        type: 'unwrap',
        hash: txHash,
        account: activeAccount,
        tokenIn: 'WAE',
        tokenOut: 'AE',
        amountIn: amountWae,
        amountOut: amountWae,
      });
    }
    notifyPendingTx({ type: TxPayloadType.UnwrapToken, amount: amountWae }, txHash);

    return txHash;
  }

  async function approveIfNeeded(amountAettos: bigint, tokenIn: any): Promise<boolean> {
    if (!tokenIn || tokenIn.is_ae) return false; // AE does not need allowance

    // Check if we need approval
    const currentAllowance = await getRouterTokenAllowance(sdk, tokenIn.address, activeAccount);
    const needsApproval = currentAllowance < amountAettos;

    if (needsApproval) {
      needsApprovalInCurrentSwap.current = true;
      setSwapStep({ current: 1, total: 2, label: 'Approve token' });

      // Notify user to sign the approval in their wallet.
      // This notification persists through both "waiting for signature"
      // and "waiting for on-chain confirmation" since we don't have the
      // approval txHash available for polling.
      notifySubmitted({
        type: TxPayloadType.ApproveAllowance,
        tokenName: tokenIn.name || tokenIn.symbol,
        tokenSymbol: tokenIn.symbol,
        amount: fromAettos(amountAettos, tokenIn.decimals),
        stepNumber: 1,
        totalSteps: 2,
      });
    }

    await ensureAllowanceForRouter(sdk, tokenIn.address, activeAccount, amountAettos);

    if (needsApproval) {
      notifyConfirmed({
        type: TxPayloadType.ApproveAllowance,
        tokenName: tokenIn.name || tokenIn.symbol,
        tokenSymbol: tokenIn.symbol,
        amount: fromAettos(amountAettos, tokenIn.decimals),
        stepNumber: 1,
        totalSteps: 2,
      });
    }

    try {
      const current = await getRouterTokenAllowance(sdk, tokenIn.address, activeAccount);
      setAllowanceInfo(`Allowance: ${fromAettos(current, tokenIn.decimals)} ${tokenIn.symbol}`);
    } catch { }

    return needsApproval;
  }

  //
  async function executeSwap(params: SwapExecutionParams): Promise<string | null> {
    setLoading(true);
    setSwapStep(null);
    needsApprovalInCurrentSwap.current = false;
    //
    try {
      // Pre-execution validation
      if (!sdk) {
        throw new Error('SDK not initialized. Please connect your wallet and try again.');
      }

      if (!activeAccount) {
        throw new Error('No active account. Please connect your wallet and try again.');
      }

      if (!params.tokenIn || !params.tokenOut) {
        throw new Error('Please select both input and output tokens.');
      }

      if (!params.amountIn || Number(params.amountIn) <= 0) {
        throw new Error('Please enter a valid amount to swap.');
      }

      if (!params.amountOut || Number(params.amountOut) <= 0) {
        throw new Error('No output amount calculated. Please try selecting different tokens or amounts.');
      }

      if (params.tokenIn.address === params.tokenOut.address) {
        throw new Error('Cannot swap the same token. Please select different tokens.');
      }

      // Handle AE to WAE or WAE to AE conversion directly
      if (isAeToWae(params.tokenIn, params.tokenOut)) {
        let txHash: string | null = null;

        if (params.tokenIn.address === 'AE' && params.tokenOut.address === DEX_ADDRESSES.wae) {
          txHash = await wrapAeToWae(params.amountIn);
        } else if (params.tokenIn.address === DEX_ADDRESSES.wae && params.tokenOut.address === 'AE') {
          txHash = await unwrapWaeToAe(params.amountIn);
        }

        return txHash;
      }

      const { router } = await initDexContracts(sdk);

      const p = params.path.length ? params.path : [];
      if (!p.length) throw new Error('No route found');

      const amountInAettos = toAettos(params.amountIn || '0', params.tokenIn?.decimals || 18);
      const amountOutAettos = toAettos(params.amountOut || '0', params.tokenOut?.decimals || 18);
      const minOutAettos = subSlippage(amountOutAettos, params.slippagePct);

      // Approve when tokenIn is an AEX9 for exact-in, or when maxIn for exact-out
      if (params.isExactIn) {
        await approveIfNeeded(amountInAettos, params.tokenIn);
      }

      // Router expects deadline in milliseconds since epoch (same as dex-ui)
      const deadline = BigInt(Date.now() + Math.max(1, Math.min(60, params.deadlineMins)) * 60_000);

      // Choose method based on AE involvement
      const isInAe = !!params.tokenIn?.is_ae;
      const isOutAe = !!params.tokenOut?.is_ae;

      // Shared payload for swap notifications
      const swapPayload = {
        type: TxPayloadType.SwapToken as typeof TxPayloadType.SwapToken,
        tokenInSymbol: params.tokenIn.symbol,
        tokenOutSymbol: params.tokenOut.symbol,
        amountIn: params.amountIn,
        amountOut: params.amountOut,
      };

      // Helper: update step indicator and prompt wallet signature for the swap
      const prepareSwapStep = () => {
        if (needsApprovalInCurrentSwap.current) {
          setSwapStep({ current: 2, total: 2, label: 'Execute swap' });
        } else {
          setSwapStep({ current: 1, total: 1, label: 'Execute swap' });
        }
        notifySubmitted(swapPayload);
      };

      let txHash: string | undefined;

      if (!isInAe && !isOutAe) {
        if (params.isExactIn) {
          prepareSwapStep();
          const res = await router.swap_exact_tokens_for_tokens(
            amountInAettos,
            minOutAettos,
            p,
            activeAccount,
            deadline,
            null,
          );
          txHash = extractAeTxHash(res);
        } else {
          const { decodedResult } = await router.get_amounts_in(amountOutAettos, p);
          const inNeeded = decodedResult[0] as bigint;
          const maxIn = (BigInt(addSlippage(inNeeded, params.slippagePct).toString()));
          await approveIfNeeded(maxIn, params.tokenIn);
          prepareSwapStep();
          const res = await router.swap_tokens_for_exact_tokens(
            amountOutAettos,
            maxIn,
            p,
            activeAccount,
            deadline,
            null,
          );
          txHash = extractAeTxHash(res);
        }
      } else if (isInAe && !isOutAe) {
        if (params.isExactIn) {
          prepareSwapStep();
          const res = await router.swap_exact_ae_for_tokens(
            minOutAettos,
            p,
            activeAccount,
            deadline,
            null,
            { amount: amountInAettos },
          );
          txHash = extractAeTxHash(res);
        } else {
          const { decodedResult } = await router.get_amounts_in(amountOutAettos, p);
          const inNeeded = decodedResult[0] as bigint;
          const maxAe = addSlippage(inNeeded, params.slippagePct).toString();
          prepareSwapStep();
          const res = await router.swap_ae_for_exact_tokens(
            amountOutAettos,
            p,
            activeAccount,
            deadline,
            null,
            { amount: maxAe },
          );
          txHash = extractAeTxHash(res);
        }
      } else if (!isInAe && isOutAe) {
        if (params.isExactIn) {
          prepareSwapStep();
          const res = await router.swap_exact_tokens_for_ae(
            amountInAettos,
            minOutAettos,
            p,
            activeAccount,
            deadline,
            null,
          );
          txHash = extractAeTxHash(res);
        } else {
          const { decodedResult } = await router.get_amounts_in(amountOutAettos, p);
          const inNeeded = decodedResult[0] as bigint;
          const maxIn = addSlippage(inNeeded, params.slippagePct);
          await approveIfNeeded(maxIn, params.tokenIn);
          prepareSwapStep();
          const res = await router.swap_tokens_for_exact_ae(
            amountOutAettos,
            maxIn,
            p,
            activeAccount,
            deadline,
            null,
          );
          txHash = extractAeTxHash(res);
        }
      } else {
        // AE -> AE routed via WAE is a no-op; prevent
        throw new Error('Invalid route: AE to AE');
      }

      if (!txHash) {
        throw new Error('Transaction failed - no hash returned');
      }

      if (activeAccount) {
        addActivity({
          type: 'swap',
          hash: txHash,
          account: activeAccount,
          tokenIn: params.tokenIn?.symbol || params.tokenIn?.address,
          tokenOut: params.tokenOut?.symbol || params.tokenOut?.address,
          amountIn: params.amountIn,
          amountOut: params.amountOut,
        });
      }

      // Tx is broadcast — hand off to the notification system for blockchain polling
      notifyPendingTx(swapPayload, txHash);

      return txHash;
    } catch (e: any) {
      const errorMsg = errorToUserMessage(e, {
        action: 'swap',
        slippagePct: params.slippagePct,
        deadlineMins: params.deadlineMins,
      });

      notifyError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
      setSwapStep(null);
    }
  }

  return {
    loading,
    allowanceInfo,
    swapStep,
    executeSwap,
  };
}
