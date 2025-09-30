import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { Decimal } from '../libs/decimal';
import { TokenDto } from '../features/trendminer/types';

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

// Actions atom for updating state 
export const tokenTradeActionsAtom = atom(
  null,
  (get, set, action: 
    | { type: 'SET_TOKEN_A'; value: number | undefined }
    | { type: 'SET_TOKEN_B'; value: number | undefined }
    | { type: 'SET_TOKEN_A_FOCUSED'; value: boolean }
    | { type: 'SET_IS_BUYING'; value: boolean }
    | { type: 'SET_IS_ALLOW_SELLING'; value: boolean }
    | { type: 'SET_LOADING_TRANSACTION'; value: boolean }
    | { type: 'SET_USER_BALANCE'; value: string | undefined }
    | { type: 'SET_NEXT_PRICE'; value: Decimal }
    | { type: 'SET_SUCCESS_TX_DATA'; value: SuccessTxData | undefined }
    | { type: 'SET_TOKEN'; value: TokenDto | undefined }
    | { type: 'SWITCH_TRADE_VIEW'; value: boolean }
    | { type: 'TOGGLE_TRADE_VIEW' }
    | { type: 'RESET_FORM_DATA' }
  ) => {
    switch (action.type) {
      case 'SET_TOKEN_A':
        set(tokenAAtom, action.value);
        break;
      case 'SET_TOKEN_B':
        set(tokenBAtom, action.value);
        break;
      case 'SET_TOKEN_A_FOCUSED':
        set(tokenAFocusedAtom, action.value);
        break;
      case 'SET_IS_BUYING':
        set(isBuyingAtom, action.value);
        break;
      case 'SET_IS_ALLOW_SELLING':
        set(isAllowSellingAtom, action.value);
        break;
      case 'SET_LOADING_TRANSACTION':
        set(loadingTransactionAtom, action.value);
        break;
      case 'SET_USER_BALANCE':
        set(userBalanceAtom, action.value);
        break;
      case 'SET_NEXT_PRICE':
        set(nextPriceAtom, action.value);
        break;
      case 'SET_SUCCESS_TX_DATA':
        set(successTxDataAtom, action.value);
        break;
      case 'SET_TOKEN':
        set(tokenTradeTokenAtom, action.value);
        break;
      case 'SWITCH_TRADE_VIEW':
        set(isBuyingAtom, action.value);
        break;
      case 'TOGGLE_TRADE_VIEW':
        const currentIsBuying = get(isBuyingAtom);
        set(isBuyingAtom, !currentIsBuying);
        break;
      case 'RESET_FORM_DATA':
        set(tokenAAtom, undefined);
        set(tokenBAtom, undefined);
        set(successTxDataAtom, undefined);
        set(nextPriceAtom, Decimal.ZERO);
        break;
    }
  }
);
