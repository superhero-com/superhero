import { useAtom } from 'jotai';
import { useCallback } from 'react';
import { deadlineMinsAtom, poolInfoAtom, providedLiquidityAtom, slippagePctAtom } from '../atoms/dexAtoms';
import { ACI, DEX_ADDRESSES, getLpBalance, getPairAddress, getPairInfo } from '../libs/dex';
import { getPairs } from '../libs/dexBackend';
import { useAeSdk } from './useAeSdk';

export const useDex = () => {
  const { sdk } = useAeSdk()
  const [slippagePct, setSlippagePct] = useAtom(slippagePctAtom);
  const [deadlineMins, setDeadlineMins] = useAtom(deadlineMinsAtom);
  const [providedLiquidity, setProvidedLiquidity] = useAtom(providedLiquidityAtom);
  const [poolInfo, setPoolInfo] = useAtom(poolInfoAtom);

  const setSlippage = useCallback((value: number) => {
    const clampedValue = Math.max(0, Math.min(50, value || 0));
    setSlippagePct(clampedValue);
    try {
      localStorage.setItem('dex:slippage', String(clampedValue));
    } catch { }
  }, [setSlippagePct]);

  const setDeadline = useCallback((value: number) => {
    const clampedValue = Math.max(1, Math.min(60, value || 10));
    setDeadlineMins(clampedValue);
    try {
      localStorage.setItem('dex:deadline', String(clampedValue));
    } catch { }
  }, [setDeadlineMins]);

  const resetAccountLiquidity = useCallback((address: string) => {
    setProvidedLiquidity(prev => ({
      ...prev,
      [address]: {},
    }));
  }, [setProvidedLiquidity]);

  const updateProvidedLiquidity = useCallback((params: {
    address: string;
    pairId: string;
    balance: string;
    token0?: { address: string; symbol?: string };
    token1?: { address: string; symbol?: string };
  }) => {
    const { address, pairId, balance, token0, token1 } = params;
    setProvidedLiquidity(prev => {
      if (!prev[address]) prev[address] = {};
      return {
        ...prev,
        [address]: {
          ...prev[address],
          [pairId]: {
            balance,
            token0: token0?.symbol || token0?.address || '',
            token1: token1?.symbol || token1?.address || '',
          },
        },
      };
    });
  }, [setProvidedLiquidity]);

  const loadPairInfo = useCallback(async ({ tokenA, tokenB }: { tokenA: string; tokenB: string }) => {
    const factory = await sdk.initializeContract({ aci: ACI.Factory, address: DEX_ADDRESSES.factory });
    const info = await getPairInfo(sdk, factory, tokenA, tokenB);

    if (info) {
      setPoolInfo(prev => ({
        ...prev,
        [info.pairAddress]: {
          totalSupply: info.totalSupply != null ? info.totalSupply.toString() : null,
          reserveA: info.reserveA.toString(),
          reserveB: info.reserveB.toString(),
        },
      }));
    }

    return info;
  }, [setPoolInfo]);

  const loadAccountLp = useCallback(async ({
    address,
    tokenA,
    tokenB
  }: {
    address: string;
    tokenA: string;
    tokenB: string;
  }) => {
    const factory = await sdk.initializeContract({ aci: ACI.Factory, address: DEX_ADDRESSES.factory });
    const pairAddr = await getPairAddress(sdk, factory, tokenA, tokenB);
    if (!pairAddr) return { pairId: null, balance: 0n };
    const bal = await getLpBalance(sdk, pairAddr, address);

    // Update provided liquidity state
    if (bal && bal > 0n) {
      updateProvidedLiquidity({
        address,
        pairId: pairAddr,
        balance: bal.toString(),
      });
    }

    return { pairId: pairAddr, balance: bal };
  }, [updateProvidedLiquidity]);

  const scanAccountLiquidity = useCallback(async (address: string) => {
    const pairs = await getPairs(false);
    const arr: any[] = pairs ? (Array.isArray(pairs) ? pairs : Object.values(pairs as any)) : [];

    for (const p of arr) {
      const balance = await getLpBalance(sdk, p.address, address).catch(() => 0n);
      if (balance && balance > 0n) {
        updateProvidedLiquidity({
          address,
          pairId: p.address,
          balance: balance.toString(),
          token0: { address: p.token0 || p.token0Address, symbol: p.token0Symbol || p.token0?.symbol },
          token1: { address: p.token1 || p.token1Address, symbol: p.token1Symbol || p.token1?.symbol },
        });
      }
    }
  }, [updateProvidedLiquidity]);

  return {
    // State
    slippagePct,
    deadlineMins,
    providedLiquidity,
    poolInfo,

    // Actions
    setSlippage,
    setDeadline,
    resetAccountLiquidity,
    updateProvidedLiquidity,

    // Async operations
    loadPairInfo,
    loadAccountLp,
    scanAccountLiquidity,
  };
};
