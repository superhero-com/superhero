import { useMemo } from 'react';
import { DexTokenDto } from '../../../api/generated';
import { useAccount } from '../../../hooks';
import { CONFIG } from '../../../config';
import { fromAettos } from '../../../libs/dex';

export function useTokenBalances(tokenIn: DexTokenDto | null, tokenOut: DexTokenDto | null) {
  const { balance, aex9Balances } = useAccount();

  const balances = useMemo(() => ({
    in: fromAettos(tokenIn?.address === 'AE' ? balance : aex9Balances.find(
      (t) => t.contract_id === tokenIn?.address,
    )?.amount || 0, tokenIn?.decimals ?? 18),
    out: fromAettos(tokenOut?.address === 'AE' ? balance : aex9Balances.find(
      (t) => t.contract_id === tokenOut?.address,
    )?.amount || 0, tokenOut?.decimals ?? 18),
  }), [balance, aex9Balances, tokenIn, tokenOut]);

  const wrapBalances = useMemo(() => ({
    ae: fromAettos(balance || 0),
    wae: fromAettos(aex9Balances.find(
      (t) => t.contract_id === CONFIG.DEX_WAE,
    )?.amount || 0),
  }), [balance, aex9Balances]);

  return { balances, wrapBalances };
}
