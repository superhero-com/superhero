import { useAtom } from 'jotai';
import { useCallback } from 'react';
import { deadlineMinsAtom, slippagePctAtom } from '../atoms/dexAtoms';

export const useDex = () => {
  const [slippagePct, setSlippagePct] = useAtom(slippagePctAtom);
  const [deadlineMins, setDeadlineMins] = useAtom(deadlineMinsAtom);

  const setSlippage = useCallback((value: number) => {
    const clampedValue = Math.max(0, Math.min(50, value || 0));
    setSlippagePct(clampedValue);
    try {
      localStorage.setItem('dex:slippage', String(clampedValue));
    } catch {
      // Ignore storage errors
    }
  }, [setSlippagePct]);

  const setDeadline = useCallback((value: number) => {
    const clampedValue = Math.max(1, Math.min(60, value || 10));
    setDeadlineMins(clampedValue);
    try {
      localStorage.setItem('dex:deadline', String(clampedValue));
    } catch {
      // Ignore storage errors
    }
  }, [setDeadlineMins]);

  // TODO: should improve this, it should come from a cached API

  return {
    // State
    slippagePct,
    deadlineMins,

    // Actions
    setSlippage,
    setDeadline,
  };
};
