import { useAtom } from 'jotai';
import { useCallback } from 'react';
import { deadlineMinsAtom, poolInfoAtom, providedLiquidityAtom, slippagePctAtom, LiquidityPositionData } from '../atoms/dexAtoms';
import { ACI, DEX_ADDRESSES, getLpBalance, getPairAddress, getPairInfo } from '../libs/dex';
import { getPairs } from '../libs/dexBackend';
import { useAeSdk } from './useAeSdk';
import { useAccount } from './useAccount';

export const useDex = () => {
  const { sdk, activeAccount } = useAeSdk()
  const { aex9Balances, loadAccountData } = useAccount()
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

  const resetAccountLiquidity = useCallback((accountAddress: string) => {
    setProvidedLiquidity(prev => ({
      ...prev,
      [accountAddress]: {}
    }));
  }, [setProvidedLiquidity]);

  const updateProvidedLiquidity = useCallback((params: {
    accountAddress: string;
    pairId: string;
    balance: string;
    token0?: { address: string; symbol?: string };
    token1?: { address: string; symbol?: string };
    sharePct?: string;
    valueUsd?: string;
  }) => {
    const { accountAddress, pairId, balance, token0, token1, sharePct, valueUsd } = params;
    setProvidedLiquidity(prev => {
      const accountLiquidity = prev[accountAddress] || {};
      return {
        ...prev,
        [accountAddress]: {
          ...accountLiquidity,
          [pairId]: {
            balance,
            token0: token0?.symbol || token0?.address || '',
            token1: token1?.symbol || token1?.address || '',
            sharePct,
            valueUsd,
          } as LiquidityPositionData,
        },
      };
    });
  }, [setProvidedLiquidity]);

  const loadPairInfo = useCallback(async ({ tokenA, tokenB }: { tokenA: string; tokenB: string }) => {
    const factory = await sdk.initializeContract({ aci: ACI.Factory, address: DEX_ADDRESSES.factory as any });
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
    accountAddress,
    tokenA,
    tokenB
  }: {
    accountAddress: string;
    tokenA: string;
    tokenB: string;
  }) => {
    const factory = await sdk.initializeContract({ aci: ACI.Factory, address: DEX_ADDRESSES.factory as any });
    const pairAddr = await getPairAddress(sdk, factory, tokenA, tokenB);
    if (!pairAddr) return { pairId: null, balance: 0n };
    const bal = await getLpBalance(sdk, pairAddr, accountAddress);

    // Update provided liquidity state
    if (bal && bal > 0n) {
      updateProvidedLiquidity({
        accountAddress,
        pairId: pairAddr,
        balance: bal.toString(),
      });
    }

    return { pairId: pairAddr, balance: bal };
  }, [updateProvidedLiquidity]);

  // TODO: should improve this, it should come from a cached API
  const scanAccountLiquidity = useCallback(async (accountAddress: string) => {
    await loadAccountData();
    const pairs = await getPairs(false);
    console.log("[useDex] scanAccountLiquidity pairs", pairs);
    const arr: any[] = pairs ? (Array.isArray(pairs) ? pairs : Object.values(pairs as any)) : [];

    for (const p of arr) {
      // this should get from user balances.
      // const balance = await getLpBalance(sdk, p.address, accountAddress).catch(() => 0n);
      const balance = aex9Balances.find(b => b.contract_id === p.address)?.amount || 0;
      if (balance && balance > 0n) {
        console.log("[useDex] scanAccountLiquidity balance", balance, p.address);
        updateProvidedLiquidity({
          accountAddress,
          pairId: p.address,
          balance: balance.toString(),
          token0: { address: p.token0 || p.token0Address, symbol: p.token0Symbol || p.token0?.symbol },
          token1: { address: p.token1 || p.token1Address, symbol: p.token1Symbol || p.token1?.symbol },
        });
      }
    }
  }, [updateProvidedLiquidity, loadAccountData, aex9Balances]);

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
