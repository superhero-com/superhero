import { useEffect, useState } from 'react';
import { getTokenBalance, fromAettos, DEX_ADDRESSES } from '../../../libs/dex';
import { Token, TokenBalance, WrapBalances } from '../types/dex';
import { useAeSdk, useWallet } from '../../../hooks';

export function useTokenBalances(tokenIn: Token | null, tokenOut: Token | null) {
  const { activeAccount, sdk } = useAeSdk()
  const [balances, setBalances] = useState<TokenBalance>({});
  const [wrapBalances, setWrapBalances] = useState<WrapBalances>({});

  // Load balances when token selection or address changes
  useEffect(() => {
    (async () => {
      try {
        if (!activeAccount) {
          return;
        }

        const inAddr = tokenIn?.isAe ? 'AE' : tokenIn?.contractId;
        const outAddr = tokenOut?.isAe ? 'AE' : tokenOut?.contractId;

        if (!inAddr && !outAddr) return;

        const [bin, bout] = await Promise.all([
          inAddr ? getTokenBalance(sdk, inAddr as any, activeAccount) : Promise.resolve(null),
          outAddr ? getTokenBalance(sdk, outAddr as any, activeAccount) : Promise.resolve(null),
        ]);

        setBalances({
          in: bin != null ? fromAettos(bin as any, tokenIn?.decimals || 18) : undefined,
          out: bout != null ? fromAettos(bout as any, tokenOut?.decimals || 18) : undefined,
        });
      } catch { }
    })();
  }, [activeAccount, tokenIn, tokenOut]);

  // Load AE/WAE balances for wrap box
  const refreshWrapBalances = async () => {
    try {
      if (!activeAccount) {
        return;
      }

      const [aeBal, waeBal] = await Promise.all([
        getTokenBalance(sdk, 'AE', activeAccount),
        getTokenBalance(sdk, DEX_ADDRESSES.wae, activeAccount),
      ]);

      setWrapBalances({
        ae: fromAettos(aeBal, 18),
        wae: fromAettos(waeBal, 18),
      });
    } catch { }
  };

  useEffect(() => {
    void refreshWrapBalances();
  }, [activeAccount]);

  return { balances, wrapBalances, refreshWrapBalances };
}
