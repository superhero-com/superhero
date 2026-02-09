import BigNumber from 'bignumber.js';
import React, { useEffect, useState } from 'react';
import { CONFIG } from '../../../config';
import { ACI, DEX_ADDRESSES, fromAettos, getPairInfo, initDexContracts, toAettos, subSlippage, MINIMUM_LIQUIDITY, ensureAllowanceForRouter, ensurePairAllowanceForRouter } from '../../../libs/dex';
import { errorToUserMessage } from '../../../libs/errorMessages';
import { useToast } from '../../../components/ToastProvider';
import { AddLiquidityState, LiquidityExecutionParams, RemoveLiquidityExecutionParams } from '../types/pool';

import { providedLiquidityAtom, useAccount, useAeSdk, useDex, useRecentActivities } from '../../../hooks';
import { useAtom } from 'jotai';
import { Decimal } from '../../../libs/decimal';
import { BridgeConstants } from '@/features/ae-eth-bridge/constants';

export function useAddLiquidity() {
  const [providedLiquidity, setProvidedLiquidity] = useAtom(providedLiquidityAtom);

  const { sdk } = useAeSdk();
  const { activeAccount: address } = useAccount();
  const { slippagePct, deadlineMins } = useDex();
  const { addActivity } = useRecentActivities();
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

  // Ensure minimum amounts passed to on-chain calls are at least 1 base unit (aettos)
  function clampToMinUnit(value: bigint): bigint {
    return value < 1n ? 1n : value;
  }

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

      // Compute ratios using raw reserves with decimal scaling to avoid precision loss
      const reserveARaw = new BigNumber(info.reserveA.toString());
      const reserveBRaw = new BigNumber(info.reserveB.toString());

      let ratioAinB = '-'; // 1 B = ? A
      let ratioBinA = '-'; // 1 A = ? B

      if (!reserveARaw.isZero() && !reserveBRaw.isZero()) {
        const powA = new BigNumber(10).pow(state.decA);
        const powB = new BigNumber(10).pow(state.decB);
        // ratioBinA = (reserveB / 10^decB) / (reserveA / 10^decA) = reserveB*10^decA / (reserveA*10^decB)
        const ratioBperA = reserveBRaw.multipliedBy(powA).dividedBy(reserveARaw.multipliedBy(powB));
        const ratioAperB = reserveARaw.multipliedBy(powB).dividedBy(reserveBRaw.multipliedBy(powA));
        // Use higher precision to avoid rounding to zero for tiny ratios
        ratioBinA = ratioBperA.toFixed(18).replace(/\.0+$/, '');
        ratioAinB = ratioAperB.toFixed(18).replace(/\.0+$/, '');
      }

      let sharePct = '0.00000000';
      let lpMintEstimate: string | undefined;
      let error: string | null = null;
      let suggestedAmountB: string | undefined;
      let suggestedAmountA: string | undefined;

      const ain = state.amountA ? new BigNumber(toAettos(state.amountA, state.decA).toString()) : null;
      const bin = state.amountB ? new BigNumber(toAettos(state.amountB, state.decB).toString()) : null;

      // Validate ratio for existing pools (only if both amounts are non-zero)
      if (ain && bin && !rA.isZero() && !rB.isZero() && !ain.isZero() && !bin.isZero()) {
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

      if (ain && bin && info.totalSupply && info.totalSupply > 0n && !reserveARaw.isZero() && !reserveBRaw.isZero()) {
        const totalSupply = new BigNumber(info.totalSupply.toString());
        // For constant product AMM, LP tokens = totalSupply * min(amountA/reserveA, amountB/reserveB)
        // Since we're adding proportional amounts, we can use either ratio
        const lpMintFromA = totalSupply.multipliedBy(ain).dividedBy(reserveARaw);
        const lpMintFromB = totalSupply.multipliedBy(bin).dividedBy(reserveBRaw);
        // Use the minimum to ensure we don't overestimate (matches on-chain calculation)
        const lpMint = BigNumber.min(lpMintFromA, lpMintFromB);
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

  async function executeAddLiquidity(params: LiquidityExecutionParams, options?: { suppressToast?: boolean }) {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const { router, factory } = await initDexContracts(sdk);

      const amountAAettos = toAettos(params.amountA, state.decA);
      const amountBAettos = toAettos(params.amountB, state.decB);
      
      let txHash: string;
      
      // Validate slippage percentage
      if (params.slippagePct < 0 || params.slippagePct >= 100) {
        throw new Error(`Invalid slippage percentage: ${params.slippagePct}%. Must be between 0 and 100.`);
      }

      if (params.isAePair) {
        const isTokenAAe = params.tokenA === BridgeConstants.aeternity.default_ae || params.tokenA === 'AE';
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
          { amount: amountAeDesired.toString(), omitUnknown: true }
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
          { omitUnknown: true }
        );
        txHash = (res?.hash || res?.tx?.hash || res?.transactionHash || '').toString();
      }

      // Track the add liquidity activity
      if (address && txHash) {
        addActivity({
          type: 'add_liquidity',
          hash: txHash,
          account: address,
          tokenIn: state.symbolA || params.tokenA,
          tokenOut: state.symbolB || params.tokenB,
          amountIn: params.amountA,
          amountOut: params.amountB,
        });
      }

      // Show success toast only if not suppressed (for backward compatibility)
      if (!options?.suppressToast) {
        const url = CONFIG.EXPLORER_URL ? `${CONFIG.EXPLORER_URL.replace(/\/$/, '')}/transactions/${txHash}` : '';
        toast.push(
          React.createElement('div', {},
            React.createElement('div', { style: { fontWeight: 600, marginBottom: 4 } }, 'Liquidity added successfully! 🎉'),
            React.createElement('div', { style: { fontSize: 13, opacity: 0.9, marginBottom: 8 } }, 'Your new position will appear in Active Positions within a few seconds'),
            txHash && CONFIG.EXPLORER_URL && React.createElement('a', {
              href: url,
              target: '_blank',
              rel: 'noreferrer',
              style: { color: '#8bc9ff', textDecoration: 'underline', fontSize: 13 }
            }, 'View transaction on explorer')
          )
        );
      }

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

  // Remove liquidity function
  async function executeRemoveLiquidity(params: RemoveLiquidityExecutionParams & { isFullRemoval?: boolean; rawBalance?: string }): Promise<string> {
    if (!address) {
      throw new Error('Wallet not connected');
    }
    
    if (!sdk) {
      throw new Error('SDK not available');
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

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
        const isTokenAAe = params.tokenA === BridgeConstants.aeternity.default_ae;
        const token = isTokenAAe ? params.tokenB : params.tokenA;

        // Get pair info to calculate expected amounts (use wrapped AE address)
        const waeAddress = DEX_ADDRESSES.wae;
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
          { omitUnknown: true }
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
          { omitUnknown: true }
        );
        
        txHash = (res?.hash || res?.tx?.hash || res?.transactionHash || '').toString();
      }

      setState(prev => ({ ...prev, loading: false }));

      if (txHash) {
        // Track the remove liquidity activity
        if (address) {
          addActivity({
            type: 'remove_liquidity',
            hash: txHash,
            account: address,
            tokenIn: state.symbolA || params.tokenA,
            tokenOut: state.symbolB || params.tokenB,
            amountIn: params.liquidity,
          });
        }

        toast.push(React.createElement('div', {},
          React.createElement('div', {}, 'Remove liquidity successful'),
          React.createElement('div', { style: { opacity: 0.9 } }, `Transaction: ${txHash.slice(0, 8)}...${txHash.slice(-8)}`)
        ));
        
        return txHash;
      } else {
        throw new Error('Transaction failed - no hash returned');
      }
    } catch (error: any) {
      console.error('Remove liquidity error:', error);
      
      const errorMsg = errorToUserMessage(error);
      setState(prev => ({ ...prev, error: errorMsg, loading: false }));

      toast.push(React.createElement('div', {},
        React.createElement('div', {}, 'Remove liquidity failed'),
        React.createElement('div', { style: { opacity: 0.9 } }, errorMsg)
      ));

      throw new Error(errorMsg);
    }
  }

  return {
    state,
    setState,
    executeAddLiquidity,
    executeRemoveLiquidity,
    computePairPreview,
  };
}
