/* eslint-disable */
import waeACI from 'dex-contracts-v2/deployment/aci/WAE.aci.json';
import React, { useRef, useState } from 'react';
import { CONFIG } from '../../../config';
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
import { errorToUserMessage } from '../../../libs/errorMessages';
import { useToast } from '../../ToastProvider';
import { SwapExecutionParams } from '../types/dex';

export function useSwapExecution() {
  const { sdk, activeAccount } = useAeSdk();
  const { addActivity } = useRecentActivities();

  const toast = useToast();
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
    const wae = await sdk.initializeContract({
      aci: waeACI,
      address: DEX_ADDRESSES.wae as `ct_${string}`,
    });
    const aettos = Decimal.from(amountAe).bigNumber;
    const result = await wae.deposit({ amount: aettos });

    // Track the wrap activity
    if (activeAccount && result?.hash) {
      addActivity({
        type: 'wrap',
        hash: result.hash,
        account: activeAccount,
        tokenIn: 'AE',
        tokenOut: 'WAE',
        amountIn: amountAe,
        amountOut: amountAe, // 1:1 wrap ratio
      });
    }

    return result?.hash || null;
  }

  async function unwrapWaeToAe(amountWae: string): Promise<string | null> {
    const wae = await sdk.initializeContract({
      aci: waeACI,
      address: DEX_ADDRESSES.wae as `ct_${string}`,
    });
    const aettos = Decimal.from(amountWae).bigNumber;
    const result = await wae.withdraw(aettos, null);

    // Track the unwrap activity
    if (activeAccount && result?.hash) {
      addActivity({
        type: 'unwrap',
        hash: result.hash,
        account: activeAccount,
        tokenIn: 'WAE',
        tokenOut: 'AE',
        amountIn: amountWae,
        amountOut: amountWae, // 1:1 unwrap ratio
      });
    }

    return result?.hash || null;
  }

  async function approveIfNeeded(amountAettos: bigint, tokenIn: any): Promise<boolean> {
    if (!tokenIn || tokenIn.is_ae) return false; // AE does not need allowance

    // Check if we need approval
    const currentAllowance = await getRouterTokenAllowance(sdk, tokenIn.address, activeAccount);
    const needsApproval = currentAllowance < amountAettos;

    if (needsApproval) {
      needsApprovalInCurrentSwap.current = true;
      setSwapStep({ current: 1, total: 2, label: 'Approve token' });
    }

    await ensureAllowanceForRouter(sdk, tokenIn.address, activeAccount, amountAettos);

    try {
      const current = await getRouterTokenAllowance(sdk, tokenIn.address, activeAccount);
      // if (current !== 0n) {
      //   setAllowanceInfo(`Allowance: ${fromAettos(current, tokenIn.decimals)} ${tokenIn.symbol}`);
      // }
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
          // AE -> WAE (wrap)
          txHash = await wrapAeToWae(params.amountIn);
        } else if (params.tokenIn.address === DEX_ADDRESSES.wae && params.tokenOut.address === 'AE') {
          // WAE -> AE (unwrap)
          txHash = await unwrapWaeToAe(params.amountIn);
        }

        if (txHash) {
          try {
            const url = CONFIG.EXPLORER_URL ? `${CONFIG.EXPLORER_URL.replace(/\/$/, '')}/transactions/${txHash}` : '';
            const actionName = params.tokenIn.address === 'AE' ? 'Wrap' : 'Unwrap';
            toast.push(
              React.createElement(
                'div',
                {},
                React.createElement('div', {}, `${actionName} submitted`),
                CONFIG.EXPLORER_URL && React.createElement('a', {
                  href: url,
                  target: '_blank',
                  rel: 'noreferrer',
                  style: { color: '#8bc9ff', textDecoration: 'underline' },
                }, 'View on explorer'),
              ),
            );
          } catch { }
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

      // Determine step based on whether approval was needed
      if (needsApprovalInCurrentSwap.current) {
        setSwapStep({ current: 2, total: 2, label: 'Execute swap' });
      } else {
        setSwapStep({ current: 1, total: 1, label: 'Execute swap' });
      }

      let txHash: string | undefined;

      if (!isInAe && !isOutAe) {
        if (params.isExactIn) {
          const res = await (router as any).swap_exact_tokens_for_tokens(
            amountInAettos,
            minOutAettos,
            p,
            activeAccount,
            deadline,
            null,
          );
          txHash = (res?.hash || res?.tx?.hash || res?.transactionHash || '').toString();
        } else {
          const { decodedResult } = await (router as any).get_amounts_in(amountOutAettos, p);
          const inNeeded = decodedResult[0] as bigint;
          const maxIn = (BigInt(addSlippage(inNeeded, params.slippagePct).toString()));
          await approveIfNeeded(maxIn, params.tokenIn);
          // Set step for exact-out swap
          if (needsApprovalInCurrentSwap.current) {
            setSwapStep({ current: 2, total: 2, label: 'Execute swap' });
          } else {
            setSwapStep({ current: 1, total: 1, label: 'Execute swap' });
          }
          const res = await (router as any).swap_tokens_for_exact_tokens(
            amountOutAettos,
            maxIn,
            p,
            activeAccount,
            deadline,
            null,
          );
          txHash = (res?.hash || res?.tx?.hash || res?.transactionHash || '').toString();
        }
      } else if (isInAe && !isOutAe) {
        if (params.isExactIn) {
          const res = await (router as any).swap_exact_ae_for_tokens(
            minOutAettos,
            p,
            activeAccount,
            deadline,
            null,
            { amount: amountInAettos },
          );
          txHash = (res?.hash || res?.tx?.hash || res?.transactionHash || '').toString();
        } else {
          const { decodedResult } = await (router as any).get_amounts_in(amountOutAettos, p);
          const inNeeded = decodedResult[0] as bigint;
          const maxAe = addSlippage(inNeeded, params.slippagePct).toString();
          const res = await (router as any).swap_ae_for_exact_tokens(
            amountOutAettos,
            p,
            activeAccount,
            deadline,
            null,
            { amount: maxAe },
          );
          txHash = (res?.hash || res?.tx?.hash || res?.transactionHash || '').toString();
        }
      } else if (!isInAe && isOutAe) {
        if (params.isExactIn) {
          const res = await (router as any).swap_exact_tokens_for_ae(
            amountInAettos,
            minOutAettos,
            p,
            activeAccount,
            deadline,
            null,
          );
          txHash = (res?.hash || res?.tx?.hash || res?.transactionHash || '').toString();
        } else {
          const { decodedResult } = await (router as any).get_amounts_in(amountOutAettos, p);
          const inNeeded = decodedResult[0] as bigint;
          const maxIn = addSlippage(inNeeded, params.slippagePct);
          await approveIfNeeded(maxIn, params.tokenIn);
          // Set step for exact-out swap
          if (needsApprovalInCurrentSwap.current) {
            setSwapStep({ current: 2, total: 2, label: 'Execute swap' });
          } else {
            setSwapStep({ current: 1, total: 1, label: 'Execute swap' });
          }
          const res = await (router as any).swap_tokens_for_exact_ae(
            amountOutAettos,
            maxIn,
            p,
            activeAccount,
            deadline,
            null,
          );
          txHash = (res?.hash || res?.tx?.hash || res?.transactionHash || '').toString();
        }
      } else {
        // AE -> AE routed via WAE is a no-op; prevent
        throw new Error('Invalid route: AE to AE');
      }

      // Track the swap activity
      if (activeAccount && txHash) {
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

      try {
        const url = CONFIG.EXPLORER_URL ? `${CONFIG.EXPLORER_URL.replace(/\/$/, '')}/transactions/${txHash || ''}` : '';
        toast.push(
          React.createElement(
            'div',
            {},
            React.createElement('div', {}, 'Swap submitted'),
            txHash && CONFIG.EXPLORER_URL && React.createElement('a', {
              href: url,
              target: '_blank',
              rel: 'noreferrer',
              style: { color: '#8bc9ff', textDecoration: 'underline' },
            }, 'View on explorer'),
          ),
        );
      } catch { }

      return txHash || null;
    } catch (e: any) {
      const errorMsg = errorToUserMessage(e, {
        action: 'swap',
        slippagePct: params.slippagePct,
        deadlineMins: params.deadlineMins,
      });

      try {
        toast.push(React.createElement(
          'div',
          {},
          React.createElement('div', {}, 'Swap failed'),
          React.createElement('div', { style: { opacity: 0.9 } }, errorMsg),
        ));
      } catch { }

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
