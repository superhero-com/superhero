import { useAtom } from 'jotai';
import { useState } from 'react';
import { providedLiquidityAtom } from '../../../atoms/dexAtoms';
import { useAccount } from '../../../hooks/useAccount';
import { useAeSdk } from '../../../hooks/useAeSdk';
import { useDex } from '../../../hooks/useDex';
import { useRecentActivities } from '../../../hooks/useRecentActivities';
import { CONFIG } from '../../../config';
import {
  MINIMUM_LIQUIDITY, ensureAllowanceForRouter, ensurePairAllowanceForRouter,
  getPairInfo, initDexContracts,
  subSlippage,
  toAettos,
} from '../../../libs/dex';
import { errorToUserMessage } from '../../../libs/errorMessages';
import { useLiquidityPreview } from './useLiquidityPreview';
import { TxPayloadType, useTransactionNotification } from '../../transaction-notification/transaction-notification.context';
import type {
  AddLiquidityState,
  LiquidityExecutionParams,
  RemoveLiquidityExecutionParams,
} from '../types/pool';

export function useAddLiquidity() {
  useAtom(providedLiquidityAtom);

  const { sdk } = useAeSdk();
  const { activeAccount: address } = useAccount();
  useDex();
  const { addActivity } = useRecentActivities();
  const { notifySubmitted, notifyPendingTx, notifyError } = useTransactionNotification();

  const [state, setState] = useState<AddLiquidityState>({
    tokenA: '',
    tokenB: '',
    amountA: '',
    amountB: '',
    symbolA: '',
    symbolB: '',
    decA: 18,
    decB: 18,
    loading: false,
    error: null,
    pairPreview: null,
    reserves: null,
    pairExists: false,
    linkAmounts: true,
    showConfirm: false,
    showSettings: false,
    allowanceInfo: null,
  });

  // Ensure minimum amounts passed to on-chain calls are at least 1 base unit (aettos)
  function clampToMinUnit(value: bigint): bigint {
    return value < 1n ? 1n : value;
  }

  const quote = useLiquidityPreview(state);

  async function executeAddLiquidity(params: LiquidityExecutionParams) {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    const symbolA = params.symbolA || state.symbolA;
    const symbolB = params.symbolB || state.symbolB;

    const notifPayload = {
      type: TxPayloadType.AddLiquidity as typeof TxPayloadType.AddLiquidity,
      tokenASymbol: symbolA,
      tokenBSymbol: symbolB,
      amountA: params.amountA,
      amountB: params.amountB,
    };

    setState((prev) => ({ ...prev, loading: true, error: null }));
    notifySubmitted(notifPayload);

    try {
      const { router } = await initDexContracts(sdk);

      const amountAAettos = toAettos(params.amountA, state.decA);
      const amountBAettos = toAettos(params.amountB, state.decB);

      let txHash: string;

      // Validate slippage percentage
      if (params.slippagePct < 0 || params.slippagePct >= 100) {
        throw new Error(`Invalid slippage percentage: ${params.slippagePct}%. Must be between 0 and 100.`);
      }

      if (params.isAePair) {
        const isTokenAAe = params.tokenA === CONFIG.DEX_WAE || params.tokenA === 'AE';
        const token = isTokenAAe ? params.tokenB : params.tokenA;
        const amountTokenDesired = isTokenAAe ? amountBAettos : amountAAettos;
        const amountAeDesired = isTokenAAe ? amountAAettos : amountBAettos;

        // Calculate minimum amounts with slippage using dex library function
        const minTokenRaw = subSlippage(amountTokenDesired, params.slippagePct);
        const minAeRaw = subSlippage(amountAeDesired, params.slippagePct);
        const minToken = clampToMinUnit(minTokenRaw);
        const minAe = clampToMinUnit(minAeRaw);
        const minimumLiquidity = MINIMUM_LIQUIDITY;

        // Validation - ensure all values are positive
        if (amountTokenDesired <= 0n) {
          throw new Error(`Invalid token amount: ${amountTokenDesired.toString()}`);
        }
        if (amountAeDesired <= 0n) {
          throw new Error(`Invalid AE amount: ${amountAeDesired.toString()}`);
        }
        if (minToken <= 0n) {
          throw new Error(`Invalid minimum token amount: ${minToken.toString()} (slippage: ${params.slippagePct}%)`);
        }
        if (minAe <= 0n) {
          throw new Error(`Invalid minimum AE amount: ${minAe.toString()} (slippage: ${params.slippagePct}%)`);
        }

        // Ensure allowance for the non-AE token
        await ensureAllowanceForRouter(sdk, token, address, amountTokenDesired);

        const res = await router.add_liquidity_ae(
          token,
          amountTokenDesired,
          minToken,
          minAe,
          address,
          minimumLiquidity,
          BigInt(Date.now() + params.deadlineMins * 60 * 1000),
          { amount: amountAeDesired.toString(), omitUnknown: true },
        );
        txHash = (res?.hash || res?.tx?.hash || res?.transactionHash || '').toString();
      } else {
        // Calculate minimum amounts with slippage using dex library function
        const minAmountARaw = subSlippage(amountAAettos, params.slippagePct);
        const minAmountBRaw = subSlippage(amountBAettos, params.slippagePct);
        const minAmountA = clampToMinUnit(minAmountARaw);
        const minAmountB = clampToMinUnit(minAmountBRaw);
        const minimumLiquidity = MINIMUM_LIQUIDITY;

        // Validation - ensure all values are positive
        if (amountAAettos <= 0n) {
          throw new Error(`Invalid amount A: ${amountAAettos.toString()}`);
        }
        if (amountBAettos <= 0n) {
          throw new Error(`Invalid amount B: ${amountBAettos.toString()}`);
        }
        if (minAmountA <= 0n) {
          throw new Error(`Invalid minimum amount A: ${minAmountA.toString()} (slippage: ${params.slippagePct}%)`);
        }
        if (minAmountB <= 0n) {
          throw new Error(`Invalid minimum amount B: ${minAmountB.toString()} (slippage: ${params.slippagePct}%)`);
        }

        // Ensure allowances for both tokens
        await ensureAllowanceForRouter(sdk, params.tokenA, address, amountAAettos);
        await ensureAllowanceForRouter(sdk, params.tokenB, address, amountBAettos);

        const res = await router.add_liquidity(
          params.tokenA,
          params.tokenB,
          amountAAettos,
          amountBAettos,
          minAmountA,
          minAmountB,
          address,
          minimumLiquidity,
          BigInt(Date.now() + params.deadlineMins * 60 * 1000),
          { omitUnknown: true },
        );
        txHash = (res?.hash || res?.tx?.hash || res?.transactionHash || '').toString();
      }

      if (!txHash) {
        throw new Error('Transaction failed - no hash returned');
      }

      // Track the add liquidity activity
      if (address) {
        addActivity({
          type: 'add_liquidity',
          hash: txHash,
          account: address,
          tokenIn: symbolA || params.tokenA,
          tokenOut: symbolB || params.tokenB,
          amountIn: params.amountA,
          amountOut: params.amountB,
        });
      }

      notifyPendingTx(notifPayload, txHash);

      // Reset form
      setState((prev) => ({
        ...prev,
        amountA: '',
        amountB: '',
        loading: false,
        showConfirm: false,
      }));

      return txHash;
    } catch (error) {
      const errorMsg = errorToUserMessage(error, {
        action: 'add-liquidity',
        slippagePct: params.slippagePct,
        deadlineMins: params.deadlineMins,
      });

      setState((prev) => ({ ...prev, error: errorMsg, loading: false }));
      notifyError(errorMsg);

      throw new Error(errorMsg);
    }
  }

  // Remove liquidity function
  async function executeRemoveLiquidity(params: RemoveLiquidityExecutionParams & { isFullRemoval?: boolean; rawBalance?: string }): Promise<string> {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    if (!sdk) {
      throw new Error('SDK not available');
    }

    const symbolA = params.tokenASymbol || params.tokenA;
    const symbolB = params.tokenBSymbol || params.tokenB;
    const liquidityPct = params.liquidityPct || '100';

    const notifPayload = {
      type: TxPayloadType.RemoveLiquidity as typeof TxPayloadType.RemoveLiquidity,
      tokenASymbol: symbolA,
      tokenBSymbol: symbolB,
      liquidityPct,
      lpAmount: params.liquidity,
    };

    setState((prev) => ({ ...prev, loading: true, error: null }));
    notifySubmitted(notifPayload);

    try {
      // Initialize DEX contracts
      const { router, factory } = await initDexContracts(sdk);

      // Convert liquidity amount to bigint
      // For full removal, use raw balance to avoid precision loss
      const liquidityAmount = params.isFullRemoval && params.rawBalance
        ? BigInt(params.rawBalance)
        : toAettos(params.liquidity, 18); // LP tokens are 18 decimals

      // Validate parameters
      if (liquidityAmount <= 0n) {
        throw new Error('Invalid liquidity amount');
      }

      if (params.slippagePct < 0 || params.slippagePct >= 100) {
        throw new Error(`Invalid slippage percentage: ${params.slippagePct}%. Must be between 0 and 100.`);
      }

      let txHash = '';

      if (params.isAePair) {
        // Handle AE pair removal
        const isTokenAAe = params.tokenA === CONFIG.DEX_WAE || params.tokenA === 'AE';
        const token = isTokenAAe ? params.tokenB : params.tokenA;

        // Get pair info to calculate expected amounts (use wrapped AE address)
        const waeAddress = CONFIG.DEX_WAE;
        const pairInfo = await getPairInfo(sdk, factory, token, waeAddress);

        if (!pairInfo || !pairInfo.reserveA || !pairInfo.reserveB || !pairInfo.totalSupply) {
          throw new Error('Unable to get pair information');
        }

        // Calculate expected amounts based on current reserves and total supply
        const totalSupply = BigInt(pairInfo.totalSupply);
        // pairInfo was fetched with (token, wae), so reserveA is always the non-AE token reserve
        // and reserveB is always the WAE reserve, regardless of original position ordering.
        const reserveToken = BigInt(pairInfo.reserveA);
        const reserveAe = BigInt(pairInfo.reserveB);

        // Calculate expected amounts: (liquidity * reserve) / totalSupply
        const expectedTokenAmount = (liquidityAmount * reserveToken) / totalSupply;
        const expectedAeAmount = (liquidityAmount * reserveAe) / totalSupply;

        // Apply slippage to get minimum amounts
        const minTokenAmountRaw = subSlippage(expectedTokenAmount, params.slippagePct);
        const minAeAmountRaw = subSlippage(expectedAeAmount, params.slippagePct);
        const minTokenAmount = clampToMinUnit(minTokenAmountRaw);
        const minAeAmount = clampToMinUnit(minAeAmountRaw);

        // Validation
        if (minTokenAmount <= 0n) {
          throw new Error(`Invalid minimum token amount: ${minTokenAmount.toString()}`);
        }
        if (minAeAmount <= 0n) {
          throw new Error(`Invalid minimum AE amount: ${minAeAmount.toString()}`);
        }

        // Ensure LP token allowance for router
        await ensurePairAllowanceForRouter(sdk, pairInfo.pairAddress, address, liquidityAmount);

        const res = await router.remove_liquidity_ae(
          token,
          liquidityAmount,
          minTokenAmount,
          minAeAmount,
          address,
          BigInt(Date.now() + params.deadlineMins * 60 * 1000),
          { omitUnknown: true },
        );

        txHash = (res?.hash || res?.tx?.hash || res?.transactionHash || '').toString();
      } else {
        // Handle token-token pair removal
        const pairInfo = await getPairInfo(sdk, factory, params.tokenA, params.tokenB);

        if (!pairInfo || !pairInfo.reserveA || !pairInfo.reserveB || !pairInfo.totalSupply) {
          throw new Error('Unable to get pair information');
        }

        // Calculate expected amounts based on current reserves and total supply
        const totalSupply = BigInt(pairInfo.totalSupply);
        const reserveA = BigInt(pairInfo.reserveA);
        const reserveB = BigInt(pairInfo.reserveB);

        // Calculate expected amounts: (liquidity * reserve) / totalSupply
        const expectedAmountA = (liquidityAmount * reserveA) / totalSupply;
        const expectedAmountB = (liquidityAmount * reserveB) / totalSupply;

        // Apply slippage to get minimum amounts
        const minAmountARaw = subSlippage(expectedAmountA, params.slippagePct);
        const minAmountBRaw = subSlippage(expectedAmountB, params.slippagePct);
        const minAmountA = clampToMinUnit(minAmountARaw);
        const minAmountB = clampToMinUnit(minAmountBRaw);

        // Validation
        if (minAmountA <= 0n) {
          throw new Error(`Invalid minimum amount A: ${minAmountA.toString()}`);
        }
        if (minAmountB <= 0n) {
          throw new Error(`Invalid minimum amount B: ${minAmountB.toString()}`);
        }

        // Ensure LP token allowance for router
        await ensurePairAllowanceForRouter(sdk, pairInfo.pairAddress, address, liquidityAmount);

        const res = await router.remove_liquidity(
          params.tokenA,
          params.tokenB,
          liquidityAmount,
          minAmountA,
          minAmountB,
          address,
          BigInt(Date.now() + params.deadlineMins * 60 * 1000),
          { omitUnknown: true },
        );

        txHash = (res?.hash || res?.tx?.hash || res?.transactionHash || '').toString();
      }

      setState((prev) => ({ ...prev, loading: false }));

      if (txHash) {
        if (address) {
          addActivity({
            type: 'remove_liquidity',
            hash: txHash,
            account: address,
            tokenIn: symbolA,
            tokenOut: symbolB,
            amountIn: params.liquidity,
          });
        }

        notifyPendingTx(notifPayload, txHash);

        return txHash;
      }
      throw new Error('Transaction failed - no hash returned');
    } catch (error: any) {
      const errorMsg = errorToUserMessage(error);
      setState((prev) => ({ ...prev, error: errorMsg, loading: false }));
      notifyError(errorMsg);

      throw new Error(errorMsg);
    }
  }

  return {
    state: { ...state, pairPreview: quote.preview, pairExists: quote.pairExists },
    quoteStatus: quote.status,
    setState,
    executeAddLiquidity,
    executeRemoveLiquidity,
    computePairPreview: quote.refetch,
  };
}
