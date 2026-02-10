import { useAtom, useAtomValue } from 'jotai';
import { useAccount } from '@/hooks';
import { TokenDto } from '@/api/generated/models/TokenDto';
import { Decimal } from '../../../libs/decimal';
import {
  tokenTradeTokenAtom,
  userBalanceAtom,
  loadingAePriceAtom,
  loadingTransactionAtom,
  desiredSlippageAtom,
  isBuyingAtom,
  isAllowSellingAtom,
  successTxDataAtom,
  tokenAAtom,
  tokenBAtom,
  tokenAFocusedAtom,
  nextPriceAtom,
  slippageAtom,
  averageTokenPriceAtom,
  currentTokenUnitPriceAtom,
  priceImpactDiffAtom,
  priceImpactPercentAtom,
  estimatedNextTokenPriceImpactDifferenceFormattedPercentageAtom,
  type SuccessTxData,
} from '../../../atoms/tokenTradeAtoms';

export function useTokenTradeStore() {
  const { decimalBalance: aeBalance } = useAccount();

  // Individual atom hooks - following the exact same pattern as the original useTokenTrade
  const [token, setToken] = useAtom(tokenTradeTokenAtom);
  const [userBalance, setUserBalance] = useAtom(userBalanceAtom);
  const [loadingAePrice, setLoadingAePrice] = useAtom(loadingAePriceAtom);
  const [loadingTransaction, setLoadingTransaction] = useAtom(loadingTransactionAtom);
  const [desiredSlippage, setDesiredSlippage] = useAtom(desiredSlippageAtom);
  const [isBuying, setIsBuying] = useAtom(isBuyingAtom);
  const [isAllowSelling, setIsAllowSelling] = useAtom(isAllowSellingAtom);
  const [successTxData, setSuccessTxData] = useAtom(successTxDataAtom);
  const [tokenA, setTokenA] = useAtom(tokenAAtom);
  const [tokenB, setTokenB] = useAtom(tokenBAtom);
  const [tokenAFocused, setTokenAFocused] = useAtom(tokenAFocusedAtom);
  const [nextPrice, setNextPrice] = useAtom(nextPriceAtom);
  const [slippage, setSlippage] = useAtom(slippageAtom);

  // Computed values (read-only)
  const averageTokenPrice = useAtomValue(averageTokenPriceAtom);
  const currentTokenUnitPrice = useAtomValue(currentTokenUnitPriceAtom);
  const priceImpactDiff = useAtomValue(priceImpactDiffAtom);
  const priceImpactPercent = useAtomValue(priceImpactPercentAtom);
  const estimatedNextTokenPriceImpactDifferenceFormattedPercentage = useAtomValue(
    estimatedNextTokenPriceImpactDifferenceFormattedPercentageAtom,
  );

  // Computed: spendableAeBalance (similar to Pinia store)
  const spendableAeBalance = (() => {
    if (aeBalance.isZero) {
      return Decimal.ZERO;
    }
    const slippageAmount = aeBalance.mul(Decimal.from(slippage).add(1)).div(100);
    const balance = aeBalance.sub(slippageAmount).sub(Decimal.from('0.001'));

    if (balance.lte(Decimal.ZERO)) {
      return Decimal.ZERO;
    }
    return balance;
  })();

  // Computed: isInsufficientBalance
  const isInsufficientBalance = (() => (isBuying
    ? Decimal.from(tokenA || 0).gt(spendableAeBalance)
    : Decimal.from(tokenB || 0).gt(Decimal.from(userBalance || 0))))();

  // Actions (similar to Pinia store methods) - using direct setters
  const switchTradeView = (state: boolean) => setIsBuying(state);
  const toggleTradeView = () => setIsBuying(!isBuying);
  const updateToken = (newToken: TokenDto | undefined) => setToken(newToken);
  const updateUserBalance = (balance: string | undefined) => setUserBalance(balance);
  const updateTokenA = (value: number | undefined) => setTokenA(value);
  const updateTokenB = (value: number | undefined) => setTokenB(value);
  const updateTokenAFocused = (focused: boolean) => setTokenAFocused(focused);
  const updateNextPrice = (price: Decimal) => setNextPrice(price);
  const updateSuccessTxData = (data: SuccessTxData | undefined) => setSuccessTxData(data);
  const updateLoadingTransaction = (loading: boolean) => setLoadingTransaction(loading);
  const updateIsAllowSelling = (allow: boolean) => setIsAllowSelling(allow);
  const updateSlippage = (newSlippage: number) => setSlippage(newSlippage);

  const resetFormData = (forceReset: boolean = false) => {
    setTokenA(undefined);
    setTokenB(undefined);
    if (forceReset) {
      setSuccessTxData(undefined);
    }
    setNextPrice(Decimal.ZERO);
  };

  return {
    // State values
    token,
    userBalance,
    loadingAePrice,
    loadingTransaction,
    desiredSlippage,
    isBuying,
    isAllowSelling,
    successTxData,
    tokenA,
    tokenB,
    tokenAFocused,
    nextPrice,
    slippage,

    // Computed values
    averageTokenPrice,
    currentTokenUnitPrice,
    priceImpactDiff,
    priceImpactPercent,
    estimatedNextTokenPriceImpactDifferenceFormattedPercentage,
    spendableAeBalance,
    isInsufficientBalance,

    // Actions
    switchTradeView,
    toggleTradeView,
    resetFormData,
    updateToken,
    updateUserBalance,
    updateTokenA,
    updateTokenB,
    updateTokenAFocused,
    updateNextPrice,
    updateSuccessTxData,
    updateLoadingTransaction,
    updateIsAllowSelling,
    updateSlippage,

    // Direct setters for convenience
    setToken,
    setUserBalance,
    setLoadingAePrice,
    setLoadingTransaction,
    setDesiredSlippage,
    setIsBuying,
    setIsAllowSelling,
    setSuccessTxData,
    setTokenA,
    setTokenB,
    setTokenAFocused,
    setNextPrice,
    setSlippage,
  };
}
