import { useEffect, useState } from 'react';
import { getTokenBalance, fromAettos, DEX_ADDRESSES } from '../../../libs/dex';
import { Token, TokenBalance, WrapBalances } from '../types/dex';
import { useWallet } from '../../../hooks';

export function useTokenBalances(tokenIn: Token | null, tokenOut: Token | null) {
  const address = useWallet().address;
  const [balances, setBalances] = useState<TokenBalance>({});
  const [wrapBalances, setWrapBalances] = useState<WrapBalances>({});

  // Load balances when token selection or address changes
  useEffect(() => {
    (async () => {
      try {
        const sdk = (window as any).__aeSdk;
        if (!sdk || !address) return;
        
        const inAddr = tokenIn?.isAe ? 'AE' : tokenIn?.contractId;
        const outAddr = tokenOut?.isAe ? 'AE' : tokenOut?.contractId;
        
        if (!inAddr && !outAddr) return;
        
        const [bin, bout] = await Promise.all([
          inAddr ? getTokenBalance(sdk, inAddr as any, address) : Promise.resolve(null),
          outAddr ? getTokenBalance(sdk, outAddr as any, address) : Promise.resolve(null),
        ]);
        
        setBalances({
          in: bin != null ? fromAettos(bin as any, tokenIn?.decimals || 18) : undefined,
          out: bout != null ? fromAettos(bout as any, tokenOut?.decimals || 18) : undefined,
        });
      } catch {}
    })();
  }, [address, tokenIn, tokenOut]);

  // Load AE/WAE balances for wrap box
  const refreshWrapBalances = async () => {
    try {
      const sdk = (window as any).__aeSdk;
      if (!sdk || !address) return;
      
      const [aeBal, waeBal] = await Promise.all([
        getTokenBalance(sdk, 'AE', address),
        getTokenBalance(sdk, DEX_ADDRESSES.wae, address),
      ]);
      
      setWrapBalances({
        ae: fromAettos(aeBal, 18),
        wae: fromAettos(waeBal, 18),
      });
    } catch {}
  };

  useEffect(() => { 
    void refreshWrapBalances(); 
  }, [address]);

  return { balances, wrapBalances, refreshWrapBalances };
}
