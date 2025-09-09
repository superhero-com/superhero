import React, { useState } from 'react';
import { CONFIG } from '../../../config';
import { useAeSdk, useRecentActivities } from '../../../hooks';
import {
  addSlippage,
  ensureAllowanceForRouter,
  fromAettos,
  getRouterTokenAllowance,
  initDexContracts,
  subSlippage,
  toAettos
} from '../../../libs/dex';
import { errorToUserMessage } from '../../../libs/errorMessages';
import { useToast } from '../../ToastProvider';
import { SwapExecutionParams } from '../types/dex';

export function useSwapExecution() {
  const { sdk, activeAccount } = useAeSdk()
  const { addActivity } = useRecentActivities();

  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [allowanceInfo, setAllowanceInfo] = useState<string | null>(null);

  async function approveIfNeeded(amountAettos: bigint, tokenIn: any) {
    if (!tokenIn || tokenIn.isAe) return; // AE does not need allowance

    // eslint-disable-next-line no-console
    console.info('[dex] Ensuring allowance for router…', {
      token: tokenIn.address,
      amount: amountAettos.toString()
    });

    await ensureAllowanceForRouter(sdk, tokenIn.address, activeAccount, amountAettos);

    try {
      const current = await getRouterTokenAllowance(sdk, tokenIn.address, activeAccount);
      setAllowanceInfo(`Allowance: ${fromAettos(current, tokenIn.decimals)} ${tokenIn.symbol}`);
    } catch { }
  }

  async function executeSwap(params: SwapExecutionParams): Promise<string | null> {
    setLoading(true);
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

      let txHash: string | undefined;

      if (!isInAe && !isOutAe) {
        if (params.isExactIn) {
          // eslint-disable-next-line no-console
          console.info('[dex] swap_exact_tokens_for_tokens', {
            amountInAettos: amountInAettos.toString(),
            minOutAettos: minOutAettos.toString(),
            path: p,
            activeAccount,
            deadline: deadline.toString()
          });
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
          // eslint-disable-next-line no-console
          console.info('[dex] swap_tokens_for_exact_tokens', {
            amountOutAettos: amountOutAettos.toString(),
            maxIn: maxIn.toString(),
            path: p,
            activeAccount,
            deadline: deadline.toString()
          });
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
          // eslint-disable-next-line no-console
          console.info('[dex] swap_exact_ae_for_tokens', {
            minOutAettos: minOutAettos.toString(),
            path: p,
            activeAccount,
            deadline: deadline.toString(),
            amountInAettos: amountInAettos.toString()
          });
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
          // eslint-disable-next-line no-console
          console.info('[dex] swap_ae_for_exact_tokens', {
            amountOutAettos: amountOutAettos.toString(),
            maxAe,
            path: p,
            activeAccount,
            deadline: deadline.toString()
          });
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
          // eslint-disable-next-line no-console
          console.info('[dex] swap_exact_tokens_for_ae', {
            amountInAettos: amountInAettos.toString(),
            minOutAettos: minOutAettos.toString(),
            path: p,
            activeAccount,
            deadline: deadline.toString()
          });
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
          // eslint-disable-next-line no-console
          console.info('[dex] swap_tokens_for_exact_ae', {
            amountOutAettos: amountOutAettos.toString(),
            maxIn: maxIn.toString(),
            path: p,
            activeAccount,
            deadline: deadline.toString()
          });
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

      // eslint-disable-next-line no-console
      console.info('[dex] Swap submitted', { txHash });

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
      console.error('[dex] Swap failed - Full error details:', {
        error: e,
        message: e?.message,
        stack: e?.stack,
        name: e?.name,
        code: e?.code,
        data: e?.data,
        params: {
          tokenIn: params.tokenIn?.symbol || params.tokenIn?.address,
          tokenOut: params.tokenOut?.symbol || params.tokenOut?.address,
          amountIn: params.amountIn,
          amountOut: params.amountOut,
          path: params.path,
          slippagePct: params.slippagePct,
          deadlineMins: params.deadlineMins,
          isExactIn: params.isExactIn
        }
      });
      
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
  };
}
