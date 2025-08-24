import React, { useState, useEffect } from 'react';
import { ACI, DEX_ADDRESSES, getPairInfo, initDexContracts, toAettos, fromAettos } from '../../../libs/dex';
import { errorToUserMessage } from '../../../libs/errorMessages';
import { useToast } from '../../ToastProvider';
import { CONFIG } from '../../../config';
import { AddLiquidityState, LiquidityQuoteParams, LiquidityExecutionParams } from '../types/pool';
import BigNumber from 'bignumber.js';

import { useWallet, useDex } from './index';
export function useAddLiquidity() {
  const address = useWallet().address;
  const slippagePct = useDex().slippagePct;
  const deadlineMins = useDex().deadlineMins;
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
    if (!addr || addr === 'AE') return { decimals: 18, symbol: 'AE' };
    const sdk = (window as any).__aeSdk;
    const t = await sdk.initializeContract({ aci: ACI.AEX9, address: addr });
    const { decodedResult } = await t.meta_info();
    return {
      decimals: Number(decodedResult.decimals ?? 18),
      symbol: decodedResult.symbol || decodedResult.name || 'TKN',
    };
  }

  // Update token metadata when tokens change
  useEffect(() => {
    if (!state.tokenA) return;
    
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
    if (!state.tokenB) return;
    
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

      const sdk = (window as any).__aeSdk;
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

      const ain = state.amountA ? new BigNumber(toAettos(state.amountA, state.decA).toString()) : null;
      const bin = state.amountB ? new BigNumber(toAettos(state.amountB, state.decB).toString()) : null;

      if (ain && bin && info.totalSupply && info.totalSupply > 0n) {
        const totalSupply = new BigNumber(info.totalSupply.toString());
        const lpMint = ain.plus(bin).div(2);
        sharePct = lpMint.div(totalSupply).times(100).toFixed(8);
        lpMintEstimate = fromAettos(lpMint.toString(), 18);
      }

      setState(prev => ({
        ...prev,
        pairPreview: {
          ratioAinB,
          ratioBinA,
          sharePct,
          lpMintEstimate,
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
      const sdk = (window as any).__aeSdk;
      const { router, factory } = await initDexContracts(sdk);

      const amountAAettos = toAettos(params.amountA, state.decA);
      const amountBAettos = toAettos(params.amountB, state.decB);

      let txHash: string;

      if (params.isAePair) {
        const res = await router.addLiquidityAe(
          params.tokenA === 'AE' ? amountAAettos : amountBAettos,
          params.tokenA === 'AE' ? params.tokenB : params.tokenA,
          params.tokenA === 'AE' ? amountBAettos : amountAAettos,
          0n, // minAe
          0n, // minTokens
          address,
          Math.floor(Date.now() / 1000) + params.deadlineMins * 60,
        );
        txHash = (res?.hash || res?.tx?.hash || res?.transactionHash || '').toString();
      } else {
        // Ensure allowances for both tokens
        // This would need to be implemented based on your allowance logic
        
        const res = await router.addLiquidity(
          params.tokenA,
          params.tokenB,
          amountAAettos,
          amountBAettos,
          0n, // minTokensA
          0n, // minTokensB
          address,
          Math.floor(Date.now() / 1000) + params.deadlineMins * 60,
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
      const errorMsg = errorToUserMessage(error, { 
        action: 'add liquidity', 
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
