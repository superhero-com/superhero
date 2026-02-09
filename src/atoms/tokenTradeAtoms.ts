import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { TokenDto } from '@/api/generated/models/TokenDto';
import { Decimal } from '../libs/decimal';

// Success transaction data interface
export interface SuccessTxData {
  isBuying: boolean;
  destAmount: Decimal;
  sourceAmount: Decimal;
  symbol: string;
  protocolReward?: Decimal;
  protocolSymbol?: string;
  userBalance: Decimal;
}

// Token trade state atoms
export const tokenTradeTokenAtom = atom<TokenDto | undefined>(undefined);
export const userBalanceAtom = atom<string | undefined>(undefined);

export const loadingAePriceAtom = atom<boolean>(false);
export const loadingTransactionAtom = atom<boolean>(false);
export const desiredSlippageAtom = atom<number>(0);

export const isBuyingAtom = atom<boolean>(true);
export const isAllowSellingAtom = atom<boolean>(false);

export const successTxDataAtom = atom<SuccessTxData | undefined>(undefined);

// Token input values
export const tokenAAtom = atom<number | undefined>(undefined);
export const tokenBAtom = atom<number | undefined>(undefined);
export const tokenAFocusedAtom = atom<boolean>(false);
export const nextPriceAtom = atom<Decimal>(Decimal.ZERO);

// Slippage with localStorage persistence
export const slippageAtom = atomWithStorage<number>('tokenTrade:slippage', (() => {
  try {
    const v = localStorage.getItem('tokenTrade:slippage');
    return v != null ? Math.max(0, Math.min(50, Number(v) || 1)) : 1;
  } catch {
    return 1;
  }
})());

// Computed atoms
export const currentTokenUnitPriceAtom = atom<Decimal>((get) => {
  const token = get(tokenTradeTokenAtom);
  return Decimal.from(token?.price || 0);
});

export const averageTokenPriceAtom = atom<Decimal>((get) => {
  const tokenA = get(tokenAAtom);
  const tokenB = get(tokenBAtom);
  const isBuying = get(isBuyingAtom);
  const token = get(tokenTradeTokenAtom);

  if (!tokenA || !tokenB || tokenA <= 0) {
    return isBuying
      ? Decimal.from(token?.price || 0)
      : Decimal.from(token?.sell_price || 0);
  }

  const _tokenA = Decimal.from(tokenA);
  const _tokenB = Decimal.from(tokenB);
  return isBuying ? _tokenA.div(_tokenB) : _tokenB.div(_tokenA);
});

export const priceImpactDiffAtom = atom<Decimal>((get) => {
  const tokenA = get(tokenAAtom);
  const tokenB = get(tokenBAtom);
  const isBuying = get(isBuyingAtom);
  const nextPrice = get(nextPriceAtom);
  const currentTokenUnitPrice = get(currentTokenUnitPriceAtom);

  if (!tokenA || !tokenB || tokenA <= 0) {
    return Decimal.ZERO;
  }

  const diff = nextPrice.sub(currentTokenUnitPrice);
  if (diff.lt(0) || !isBuying) {
    return currentTokenUnitPrice.sub(nextPrice);
  }
  return diff;
});

export const priceImpactPercentAtom = atom<Decimal>((get) => {
  const nextPrice = get(nextPriceAtom);
  const currentTokenUnitPrice = get(currentTokenUnitPriceAtom);
  const priceImpactDiff = get(priceImpactDiffAtom);

  if (nextPrice.isZero || currentTokenUnitPrice.isZero) {
    return Decimal.ZERO;
  }

  return priceImpactDiff.div(currentTokenUnitPrice).mul(100);
});

export const estimatedNextTokenPriceImpactDifferenceFormattedPercentageAtom = atom<string>((get) => {
  const priceImpactPercent = get(priceImpactPercentAtom);
  return priceImpactPercent.gt(Decimal.from(1))
    ? priceImpactPercent.prettify(2)
    : priceImpactPercent.prettify();
});
