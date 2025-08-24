import React, { useState } from 'react';
import {
  initDexContracts,
  toAettos,
  fromAettos,
  subSlippage,
  addSlippage,
  ensureAllowanceForRouter,
  getRouterTokenAllowance,
  DEX_ADDRESSES
} from '../../../libs/dex';
import { errorToUserMessage } from '../../../libs/errorMessages';
import { useToast } from '../../ToastProvider';
import { CONFIG } from '../../../config';
import { SwapExecutionParams } from '../types/dex';
import { useAeternity } from '../../../hooks';

export function useSwapExecution() {
  const { initSdk, scanForWallets, getAeSdk } = useAeternity();

  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [allowanceInfo, setAllowanceInfo] = useState<string | null>(null);

  async function ensureWallet() {
    // eslint-disable-next-line no-console
    console.info('[dex] Ensuring wallet is connected…');
    await initSdk();
    await scanForWallets();
    const address = (window as any).__aeSdk?.address;
    console.log("[dex] ensureWallet::", address);
    if (!address) {
      // eslint-disable-next-line no-console
      console.info('[dex] No address set, scanning for wallets…');
      await scanForWallets();
    }
    // eslint-disable-next-line no-console
    console.info('[dex] Wallet ensure complete');
  }

  async function approveIfNeeded(amountAettos: bigint, tokenIn: any) {
    if (!tokenIn || tokenIn.isAe) return; // AE does not need allowance
    const sdk = (window as any).__aeSdk;
    const address = sdk?.address;

    // eslint-disable-next-line no-console
    console.info('[dex] Ensuring allowance for router…', {
      token: tokenIn.contractId,
      amount: amountAettos.toString()
    });

    await ensureAllowanceForRouter(sdk, tokenIn.contractId, address, amountAettos);

    try {
      const current = await getRouterTokenAllowance(sdk, tokenIn.contractId, address);
      setAllowanceInfo(`Allowance: ${fromAettos(current, tokenIn.decimals)} ${tokenIn.symbol}`);
    } catch { }
  }

  async function executeSwap(params: SwapExecutionParams): Promise<string | null> {
    setLoading(true);
    //

    try {
      // eslint-disable-next-line no-console
      console.info('[dex] Submitting swap…');
      await ensureWallet();

      const sdk = (window as any).__aeSdk;
      const { router } = await initDexContracts(sdk);
      const address = sdk?.address;

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
      const toAccount = address.replace('ak_', 'ak_');

      // Choose method based on AE involvement
      const isInAe = !!params.tokenIn?.isAe;
      const isOutAe = !!params.tokenOut?.isAe;

      let txHash: string | undefined;

      if (!isInAe && !isOutAe) {
        if (params.isExactIn) {
          // eslint-disable-next-line no-console
          console.info('[dex] swap_exact_tokens_for_tokens', {
            amountInAettos: amountInAettos.toString(),
            minOutAettos: minOutAettos.toString(),
            path: p,
            toAccount,
            deadline: deadline.toString()
          });
          const res = await (router as any).swap_exact_tokens_for_tokens(
            amountInAettos,
            minOutAettos,
            p,
            toAccount,
            deadline,
            null,
          );
          txHash = (res?.hash || res?.tx?.hash || res?.transactionHash || '').toString();
        } else {
          const { decodedResult } = await (router as any).get_amounts_in(amountOutAettos, p);
          const inNeeded = decodedResult[0] as bigint;
          const maxIn = (BigInt(addSlippage(inNeeded, params.slippagePct).toString()));
          await approveIfNeeded(maxIn, params.tokenIn);
          // eslint-disable-next-line no-console
          console.info('[dex] swap_tokens_for_exact_tokens', {
            amountOutAettos: amountOutAettos.toString(),
            maxIn: maxIn.toString(),
            path: p,
            toAccount,
            deadline: deadline.toString()
          });
          const res = await (router as any).swap_tokens_for_exact_tokens(
            amountOutAettos,
            maxIn,
            p,
            toAccount,
            deadline,
            null,
          );
          txHash = (res?.hash || res?.tx?.hash || res?.transactionHash || '').toString();
        }
      } else if (isInAe && !isOutAe) {
        if (params.isExactIn) {
          // eslint-disable-next-line no-console
          console.info('[dex] swap_exact_ae_for_tokens', {
            minOutAettos: minOutAettos.toString(),
            path: p,
            toAccount,
            deadline: deadline.toString(),
            amountInAettos: amountInAettos.toString()
          });
          const res = await (router as any).swap_exact_ae_for_tokens(
            minOutAettos,
            p,
            toAccount,
            deadline,
            null,
            { amount: amountInAettos },
          );
          txHash = (res?.hash || res?.tx?.hash || res?.transactionHash || '').toString();
        } else {
          const { decodedResult } = await (router as any).get_amounts_in(amountOutAettos, p);
          const inNeeded = decodedResult[0] as bigint;
          const maxAe = addSlippage(inNeeded, params.slippagePct).toString();
          // eslint-disable-next-line no-console
          console.info('[dex] swap_ae_for_exact_tokens', {
            amountOutAettos: amountOutAettos.toString(),
            maxAe,
            path: p,
            toAccount,
            deadline: deadline.toString()
          });
          const res = await (router as any).swap_ae_for_exact_tokens(
            amountOutAettos,
            p,
            toAccount,
            deadline,
            null,
            { amount: maxAe },
          );
          txHash = (res?.hash || res?.tx?.hash || res?.transactionHash || '').toString();
        }
      } else if (!isInAe && isOutAe) {
        if (params.isExactIn) {
          // eslint-disable-next-line no-console
          console.info('[dex] swap_exact_tokens_for_ae', {
            amountInAettos: amountInAettos.toString(),
            minOutAettos: minOutAettos.toString(),
            path: p,
            toAccount,
            deadline: deadline.toString()
          });
          const res = await (router as any).swap_exact_tokens_for_ae(
            amountInAettos,
            minOutAettos,
            p,
            toAccount,
            deadline,
            null,
          );
          txHash = (res?.hash || res?.tx?.hash || res?.transactionHash || '').toString();
        } else {
          const { decodedResult } = await (router as any).get_amounts_in(amountOutAettos, p);
          const inNeeded = decodedResult[0] as bigint;
          const maxIn = addSlippage(inNeeded, params.slippagePct);
          await approveIfNeeded(maxIn, params.tokenIn);
          // eslint-disable-next-line no-console
          console.info('[dex] swap_tokens_for_exact_ae', {
            amountOutAettos: amountOutAettos.toString(),
            maxIn: maxIn.toString(),
            path: p,
            toAccount,
            deadline: deadline.toString()
          });
          const res = await (router as any).swap_tokens_for_exact_ae(
            amountOutAettos,
            maxIn,
            p,
            toAccount,
            deadline,
            null,
          );
          txHash = (res?.hash || res?.tx?.hash || res?.transactionHash || '').toString();
        }
      } else {
        // AE -> AE routed via WAE is a no-op; prevent
        throw new Error('Invalid route: AE to AE');
      }

      // eslint-disable-next-line no-console
      console.info('[dex] Swap submitted', { txHash });

      try {
        const url = CONFIG.EXPLORER_URL ? `${CONFIG.EXPLORER_URL.replace(/\/$/, '')}/transactions/${txHash || ''}` : '';
        toast.push(
          React.createElement('div', {},
            React.createElement('div', {}, 'Swap submitted'),
            txHash && CONFIG.EXPLORER_URL && React.createElement('a', {
              href: url,
              target: '_blank',
              rel: 'noreferrer',
              style: { color: '#8bc9ff', textDecoration: 'underline' }
            }, 'View on explorer')
          )
        );
      } catch { }

      return txHash || null;
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.warn('[dex] Swap failed', e);
      const errorMsg = errorToUserMessage(e, {
        action: 'swap',
        slippagePct: params.slippagePct,
        deadlineMins: params.deadlineMins
      });

      try {
        toast.push(React.createElement('div', {},
          React.createElement('div', {}, 'Swap failed'),
          React.createElement('div', { style: { opacity: 0.9 } }, errorMsg)
        ));
      } catch { }

      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }

  return {
    loading,
    allowanceInfo,
    executeSwap,
    ensureWallet
  };
}
