import { useMemo, useState } from 'react';
import { DexTokenDto } from '../../../api/generated';
import { useAccount, useAeSdk } from '../../../hooks';
import { DEX_ADDRESSES, fromAettos } from '../../../libs/dex';
import { TokenBalance, WrapBalances } from '../types/dex';

export function useTokenBalances(tokenIn: DexTokenDto | null, tokenOut: DexTokenDto | null) {
  const { balance, aex9Balances } = useAccount();
  const { activeAccount, sdk } = useAeSdk();
  const [_balances, setBalances] = useState<TokenBalance>({});
  const [_wrapBalances, setWrapBalances] = useState<WrapBalances>({});

  const balances = useMemo(() => ({
    in: fromAettos(tokenIn?.address === 'AE' ? balance : aex9Balances.find(
      (t) => t.contract_id === tokenIn?.address,
    )?.amount || 0),
    out: fromAettos(tokenOut?.address === 'AE' ? balance : aex9Balances.find(
      (t) => t.contract_id === tokenOut?.address,
    )?.amount || 0),
  }), [balance, aex9Balances, tokenIn, tokenOut]);

  const wrapBalances = useMemo(() => ({
    ae: fromAettos(balance || 0),
    wae: fromAettos(aex9Balances.find(
      (t) => t.contract_id === DEX_ADDRESSES.wae,
    )?.amount || 0),
  }), [aex9Balances]);

  return { balances, wrapBalances };
}
