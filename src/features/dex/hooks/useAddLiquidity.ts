import BigNumber from 'bignumber.js';
import React, { useEffect, useState } from 'react';
import { CONFIG } from '../../../config';
import { ACI, DEX_ADDRESSES, fromAettos, getPairInfo, initDexContracts, toAettos, subSlippage, MINIMUM_LIQUIDITY, ensureAllowanceForRouter } from '../../../libs/dex';
import { errorToUserMessage } from '../../../libs/errorMessages';
import { useToast } from '../../../components/ToastProvider';
import { AddLiquidityState, LiquidityExecutionParams } from '../../../components/pool/types/pool';

import { useAccount, useAeSdk, useDex } from '../../../hooks';

export function useAddLiquidity() {
  const { sdk } = useAeSdk();
  const { activeAccount: address } = useAccount();
  const { slippagePct, deadlineMins } = useDex();
  const toast = useToast();

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

  async function fetchTokenMeta(addr: string): Promise<{ decimals: number; symbol: string }> {
    if (addr === 'AE') {
      return { decimals: 18, symbol: 'AE' };
    }
    const t = await sdk.initializeContract({ aci: ACI.AEX9, address: addr as `ct_${string}` });
    const { decodedResult } = await t.meta_info();
    return {
      decimals: Number(decodedResult.decimals ?? 18),
      symbol: decodedResult.symbol || decodedResult.name || 'TKN',
    };
  }

  // Update token metadata when tokens change
  useEffect(() => {
    if (!state.tokenA || state.tokenA === 'AE') return;

    fetchTokenMeta(state.tokenA)
      .then(({ decimals, symbol }) => {
        setState(prev => ({ ...prev, decA: decimals, symbolA: symbol }));
      })
      .catch(() => {
        setState(prev => ({
          ...prev,
          decA: 18,
          symbolA: state.tokenA === 'AE' ? 'AE' : ''
        }));
      });
  }, [state.tokenA]);

  useEffect(() => {
    if (!state.tokenB || state.tokenB === 'AE') return;

    fetchTokenMeta(state.tokenB)
      .then(({ decimals, symbol }) => {
        setState(prev => ({ ...prev, decB: decimals, symbolB: symbol }));
      })
      .catch(() => {
        setState(prev => ({
          ...prev,
          decB: 18,
          symbolB: state.tokenB === 'AE' ? 'AE' : ''
        }));
      });
  }, [state.tokenB]);

  // Compute pair preview when amounts or tokens change
  useEffect(() => {
    computePairPreview();
  }, [state.tokenA, state.tokenB, state.amountA, state.amountB, state.decA, state.decB]);

  async function computePairPreview() {
    try {
      if (!state.tokenA || !state.tokenB) {
        setState(prev => ({ ...prev, pairPreview: null, reserves: null, pairExists: false }));
        return;
      }

      const { factory } = await initDexContracts(sdk);
      const aAddr = state.tokenA === 'AE' ? DEX_ADDRESSES.wae : state.tokenA;
      const bAddr = state.tokenB === 'AE' ? DEX_ADDRESSES.wae : state.tokenB;

      const info = await getPairInfo(sdk, factory, aAddr, bAddr);

      if (!info) {
        setState(prev => ({
          ...prev,
          pairPreview: null,
          reserves: null,
          pairExists: false
        }));
        return;
      }

      setState(prev => ({
        ...prev,
        reserves: { reserveA: info.reserveA, reserveB: info.reserveB },
        pairExists: true
      }));

      const rA = new BigNumber(fromAettos(info.reserveA, state.decA));
      const rB = new BigNumber(fromAettos(info.reserveB, state.decB));
      const ratioAinB = rB.isZero() ? '-' : rA.div(rB).toFixed(8);
      const ratioBinA = rA.isZero() ? '-' : rB.div(rA).toFixed(8);

      let sharePct = '0.00000000';
      let lpMintEstimate: string | undefined;
      let error: string | null = null;
      let suggestedAmountB: string | undefined;
      let suggestedAmountA: string | undefined;

      const ain = state.amountA ? new BigNumber(toAettos(state.amountA, state.decA).toString()) : null;
      const bin = state.amountB ? new BigNumber(toAettos(state.amountB, state.decB).toString()) : null;

      // Validate ratio for existing pools
      if (ain && bin && !rA.isZero() && !rB.isZero()) {
        const currentRatio = rA.div(rB);
        const inputRatio = ain.div(bin);
        const ratioDifference = currentRatio.minus(inputRatio).abs().div(currentRatio).times(100);
        
        // If ratio difference is > 1%, suggest optimal amounts
        if (ratioDifference.gt(1)) {
          // Calculate optimal amount B based on amount A
          const optimalB = ain.div(currentRatio);
          suggestedAmountB = fromAettos(optimalB.toString(), state.decB);
          
          // Calculate optimal amount A based on amount B  
          const optimalA = bin.times(currentRatio);
          suggestedAmountA = fromAettos(optimalA.toString(), state.decA);
          
          error = `Ratio mismatch. Current pool ratio: 1 ${state.symbolA} = ${rB.div(rA).toFixed(6)} ${state.symbolB}`;
        }
      }

      if (ain && bin && info.totalSupply && info.totalSupply > 0n) {
        const totalSupply = new BigNumber(info.totalSupply.toString());
        const lpMint = ain.plus(bin).div(2);
        sharePct = lpMint.div(totalSupply).times(100).toFixed(8);
        lpMintEstimate = fromAettos(lpMint.toString(), 18);
      }

      setState(prev => ({
        ...prev,
        error,
        pairPreview: {
          ratioAinB,
          ratioBinA,
          sharePct,
          lpMintEstimate,
          suggestedAmountA,
          suggestedAmountB,
        }
      }));

    } catch (error) {
      console.error('Error computing pair preview:', error);
      setState(prev => ({ ...prev, pairPreview: null }));
    }
  }

  async function executeAddLiquidity(params: LiquidityExecutionParams) {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { router, factory } = await initDexContracts(sdk);

      const amountAAettos = toAettos(params.amountA, state.decA);
      const amountBAettos = toAettos(params.amountB, state.decB);
      
      console.log('Raw amounts::', {
        amountA: params.amountA,
        amountB: params.amountB,
        decA: state.decA,
        decB: state.decB,
        amountAAettos: amountAAettos.toString(),
        amountBAettos: amountBAettos.toString()
      });

      let txHash: string;

      console.log('========================')
      console.log('executeAddLiquidity->router::', router)
      console.log('executeAddLiquidity->params::', params)
      console.log('executeAddLiquidity->amountAAettos::', amountAAettos.toString())
      console.log('executeAddLiquidity->amountBAettos::', amountBAettos.toString())
      console.log('executeAddLiquidity->currentTime::', Date.now())
      console.log('executeAddLiquidity->deadline::', Date.now() + params.deadlineMins * 60 * 1000)
      console.log('executeAddLiquidity->deadlineMinutes::', params.deadlineMins)
      console.log('executeAddLiquidity->slippagePct::', params.slippagePct)
      console.log('========================')
      
      // Validate slippage percentage
      if (params.slippagePct < 0 || params.slippagePct >= 100) {
        throw new Error(`Invalid slippage percentage: ${params.slippagePct}%. Must be between 0 and 100.`);
      }

      if (params.isAePair) {
        const isTokenAAe = params.tokenA === 'AE';
        const token = isTokenAAe ? params.tokenB : params.tokenA;
        const amountTokenDesired = isTokenAAe ? amountBAettos : amountAAettos;
        const amountAeDesired = isTokenAAe ? amountAAettos : amountBAettos;
        
        // Calculate minimum amounts with slippage using dex library function
        const minToken = subSlippage(amountTokenDesired, params.slippagePct);
        const minAe = subSlippage(amountAeDesired, params.slippagePct);
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
        console.log('Ensuring token allowance for router...');
        await ensureAllowanceForRouter(sdk, token, address, amountTokenDesired);
        console.log('Token allowance ensured.');
        
        console.log('add_liquidity_ae params::', {
          token,
          amountTokenDesired: amountTokenDesired.toString(),
          minToken: minToken.toString(),
          minAe: minAe.toString(),
          address,
          minimumLiquidity: minimumLiquidity.toString(),
          deadline: BigInt(Date.now() + params.deadlineMins * 60 * 1000).toString(),
          amount: amountAeDesired.toString(),
          slippagePct: params.slippagePct,
          slippageCheck: `${params.slippagePct}% slippage on ${amountTokenDesired.toString()} = ${minToken.toString()}`
        });
        
        const res = await router.add_liquidity_ae(
          token,
          amountTokenDesired,
          minToken,
          minAe,
          address,
          minimumLiquidity,
          BigInt(Date.now() + params.deadlineMins * 60 * 1000),
          { amount: amountAeDesired.toString() }
        );
        txHash = (res?.hash || res?.tx?.hash || res?.transactionHash || '').toString();
      } else {
        // Calculate minimum amounts with slippage using dex library function
        const minAmountA = subSlippage(amountAAettos, params.slippagePct);
        const minAmountB = subSlippage(amountBAettos, params.slippagePct);
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
        console.log('Ensuring token allowances for router...');
        await ensureAllowanceForRouter(sdk, params.tokenA, address, amountAAettos);
        await ensureAllowanceForRouter(sdk, params.tokenB, address, amountBAettos);
        console.log('Token allowances ensured.');
        
        console.log('add_liquidity params::', {
          tokenA: params.tokenA,
          tokenB: params.tokenB,
          amountAAettos: amountAAettos.toString(),
          amountBAettos: amountBAettos.toString(),
          minAmountA: minAmountA.toString(),
          minAmountB: minAmountB.toString(),
          address,
          minimumLiquidity: minimumLiquidity.toString(),
          deadline: BigInt(Date.now() + params.deadlineMins * 60 * 1000).toString(),
          slippagePct: params.slippagePct,
          slippageCheckA: `${params.slippagePct}% slippage on ${amountAAettos.toString()} = ${minAmountA.toString()}`,
          slippageCheckB: `${params.slippagePct}% slippage on ${amountBAettos.toString()} = ${minAmountB.toString()}`
        });
        
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
        );
        txHash = (res?.hash || res?.tx?.hash || res?.transactionHash || '').toString();
      }

      // Show success toast
      const url = CONFIG.EXPLORER_URL ? `${CONFIG.EXPLORER_URL.replace(/\/$/, '')}/transactions/${txHash}` : '';
      toast.push(
        React.createElement('div', {},
          React.createElement('div', {}, 'Liquidity added successfully'),
          txHash && CONFIG.EXPLORER_URL && React.createElement('a', {
            href: url,
            target: '_blank',
            rel: 'noreferrer',
            style: { color: '#8bc9ff', textDecoration: 'underline' }
          }, 'View on explorer')
        )
      );

      // Reset form
      setState(prev => ({
        ...prev,
        amountA: '',
        amountB: '',
        loading: false,
        showConfirm: false,
      }));

      return txHash;

    } catch (error) {
      console.log('========================')
      console.log('executeAddLiquidity->error::', error)
      console.log('========================')
      const errorMsg = errorToUserMessage(error, {
        action: 'add-liquidity',
        slippagePct: params.slippagePct,
        deadlineMins: params.deadlineMins
      });

      setState(prev => ({ ...prev, error: errorMsg, loading: false }));

      toast.push(React.createElement('div', {},
        React.createElement('div', {}, 'Add liquidity failed'),
        React.createElement('div', { style: { opacity: 0.9 } }, errorMsg)
      ));

      throw new Error(errorMsg);
    }
  }

  return {
    state,
    setState,
    executeAddLiquidity,
    computePairPreview,
  };
}
