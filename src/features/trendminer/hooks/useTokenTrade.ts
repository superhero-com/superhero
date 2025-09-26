import { useState, useCallback, useRef, useEffect } from 'react';
import BigNumber from 'bignumber.js';
import { useAeSdk } from '../../../hooks/useAeSdk';
import { Decimal } from '../../../libs/decimal';
import { TokenDto, TokenTradeState } from '../types';
import {
  calculateBuyPriceWithAffiliationFee,
  calculateSellReturn,
  calculateTokensFromAE,
  toDecimals,
  toAe
} from '../../../utils/bondingCurve';
import { useUserBalance } from '../../../hooks/useUserBalance';
import { useAccount } from '@/hooks';

// Constants from Vue implementation
const PROTOCOL_DAO_AFFILIATION_FEE = 0.05;
const PROTOCOL_DAO_TOKEN_AE_RATIO = 1000;

interface UseTokenTradeProps {
  token: TokenDto;
}

export function useTokenTrade({ token }: UseTokenTradeProps) {
  const { sdk, activeAccount } = useAeSdk();
  const { decimalBalance: spendableAeBalance } = useAccount();
  
  const [state, setState] = useState<TokenTradeState>({
    tokenAFocused: false,
    isBuying: true,
    isAllowSelling: false,
    loadingTransaction: false,
    nextPrice: Decimal.ZERO,
    userBalance: '0',
    slippage: 1.0,
  });

  const tokenRef = useRef<TokenDto>(token);

  // Calculate next price using bonding curve
  const calculateNextPrice = useCallback((currentSupply: Decimal) => {
    try {
      const price = Decimal.from(
        toAe(
          calculateBuyPriceWithAffiliationFee(
            new BigNumber(currentSupply.bigNumber),
            new BigNumber(1).multipliedBy(new BigNumber(10).pow(18)),
          ),
        ),
      );
      setState(prev => ({ ...prev, nextPrice: price }));
    } catch (error) {
      console.error('Error calculating bonding curve price:', error);
      setState(prev => ({ ...prev, nextPrice: Decimal.ZERO }));
    }
  }, []);

  // Calculate token cost based on bonding curve
  const calculateTokenCost = useCallback((amount?: number, _isBuying = false, _isUsingToken = false): number => {
    const tokenDecimals = tokenRef.current.decimals ?? 18;
    const tokenSupply = new BigNumber(tokenRef.current.total_supply ?? 0);
    let currentSupply = Decimal.from(toAe(tokenSupply.toString()));

    if (!amount || amount <= 0) {
      calculateNextPrice(currentSupply);
      return amount || 0;
    }

    const tokenAmountBigNumber = new BigNumber(toDecimals(amount, tokenDecimals).toString());
    let tokenAmountCostDecimal: Decimal;

    if (_isBuying) {
      if (_isUsingToken) {
        currentSupply = currentSupply.add(Decimal.from(amount));
        tokenAmountCostDecimal = Decimal.from(
          toAe(calculateBuyPriceWithAffiliationFee(tokenSupply, tokenAmountBigNumber)),
        );
      } else {
        tokenAmountCostDecimal = Decimal.from(
          calculateTokensFromAE(tokenSupply, amount).toFixed(2),
        );
        currentSupply = currentSupply.add(tokenAmountCostDecimal.toString());
      }
    } else {
      if (_isUsingToken) {
        currentSupply = currentSupply.sub(Decimal.from(amount));
        tokenAmountCostDecimal = Decimal.from(
          toAe(calculateSellReturn(tokenSupply, tokenAmountBigNumber)),
        );
      } else {
        tokenAmountCostDecimal = Decimal.from(
          calculateTokensFromAE(tokenSupply, amount).toFixed(2),
        );
        currentSupply = currentSupply.sub(tokenAmountCostDecimal.toString());
      }
    }

    calculateNextPrice(currentSupply);
    return parseFloat(tokenAmountCostDecimal.toString());
  }, [calculateNextPrice]);

  // Update token reference when prop changes
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  // Watch tokenA changes and calculate tokenB automatically
  useEffect(() => {
    if (
      state.tokenA === undefined ||
      state.tokenA <= 0 ||
      !state.tokenAFocused ||
      !tokenRef.current.sale_address
    ) {
      return;
    }

    const calculatedTokenB = calculateTokenCost(
      state.tokenA,
      state.isBuying,
      !state.isBuying
    );

    setState(prev => ({
      ...prev,
      tokenB: calculatedTokenB
    }));
  }, [state.tokenA, state.isBuying, state.tokenAFocused, calculateTokenCost]);

  // Watch tokenB changes and calculate tokenA automatically  
  useEffect(() => {
    if (
      state.tokenB === undefined ||
      state.tokenB <= 0 ||
      state.tokenAFocused ||
      !tokenRef.current.sale_address
    ) {
      return;
    }

    const calculatedTokenA = calculateTokenCost(
      state.tokenB,
      state.isBuying,
      state.isBuying
    );

    setState(prev => ({
      ...prev,
      tokenA: calculatedTokenA
    }));
  }, [state.tokenB, state.isBuying, state.tokenAFocused, calculateTokenCost]);

  const resetFormState = useCallback(() => {
    setState(prev => ({
      ...prev,
      tokenA: undefined,
      tokenB: undefined,
      errorMessage: undefined,
      successTxData: undefined,
      loadingTransaction: false,
      nextPrice: Decimal.ZERO,
    }));
  }, []);

  const switchTradeView = useCallback((isBuying: boolean) => {
    setState(prev => ({
      ...prev,
      isBuying,
      tokenA: undefined,
      tokenB: undefined,
    }));
  }, []);

  const updateToken = useCallback((newToken: TokenDto) => {
    tokenRef.current = newToken;
    resetFormState();
  }, [resetFormState]);

  const setTokenAmount = useCallback((amount: number | undefined, isTokenA: boolean) => {
    setState(prev => ({
      ...prev,
      [isTokenA ? 'tokenA' : 'tokenB']: amount,
      tokenAFocused: isTokenA,
    }));
  }, []);

  const setSlippage = useCallback((slippage: number) => {
    setState(prev => ({ ...prev, slippage }));
  }, []);

  // Calculate average token price
  const averageTokenPrice = (): Decimal => {
    if (!state.tokenA || !state.tokenB || state.tokenA <= 0) {
      return state.isBuying
        ? Decimal.from(tokenRef.current?.price || 0)
        : Decimal.from(tokenRef.current?.sell_price || 0);
    }
    const tokenA = Decimal.from(state.tokenA);
    const tokenB = Decimal.from(state.tokenB);
    return state.isBuying ? tokenA.div(tokenB) : tokenB.div(tokenA);
  };

  // Calculate price impact
  const priceImpactDiff = (): Decimal => {
    if (!state.tokenA || !state.tokenB || state.tokenA <= 0) {
      return Decimal.ZERO;
    }
    const currentPrice = Decimal.from(tokenRef.current?.price || 0);
    const diff = state.nextPrice.sub(currentPrice);
    if (diff.lt(0) || !state.isBuying) {
      return currentPrice.sub(state.nextPrice);
    }
    return diff;
  };

  // Calculate price impact percentage
  const priceImpactPercent = (): Decimal => {
    const currentPrice = Decimal.from(tokenRef.current?.price || 0);
    if (state.nextPrice.isZero || currentPrice.isZero) {
      return Decimal.ZERO;
    }
    return priceImpactDiff().div(currentPrice).mul(100);
  };

  // Calculate formatted percentage for display
  const estimatedNextTokenPriceImpactDifferenceFormattedPercentage = (): string => {
    const percentValue = priceImpactPercent();
    return percentValue.gt(Decimal.from(1))
      ? percentValue.prettify(2)
      : percentValue.prettify();
  };

  // Calculate protocol DAO reward for buying
  const protocolTokenReward = (): number => {
    if (!state.isBuying) return 0;
    const aeValue = state.isBuying ? state.tokenA || 0 : state.tokenB || 0;
    return Math.round(
      (1 - PROTOCOL_DAO_AFFILIATION_FEE) * PROTOCOL_DAO_TOKEN_AE_RATIO * aeValue * 100
    ) / 100;
  };


  // Check if user has insufficient balance
  const isInsufficientBalance = (): boolean => {
    if (state.isBuying) {
      return Decimal.from(state.tokenA || 0).gt(spendableAeBalance);
    } else {
      return Decimal.from(state.tokenB || 0).gt(Decimal.from(state.userBalance || '0'));
    }
  };

  const placeTokenTradeOrder = useCallback(async (tokenToTrade: TokenDto) => {
    setState(prev => ({ ...prev, loadingTransaction: true, errorMessage: undefined }));
    
    try {
      // This is a simplified implementation
      // In a real app, this would integrate with the blockchain SDK
      
      if (!sdk || !activeAccount) {
        throw new Error('Wallet not connected');
      }

      if (state.isBuying && (!state.tokenB || state.tokenB <= 0)) {
        throw new Error('Amount not set');
      }

      if (!state.isBuying && (!state.tokenA || state.tokenA <= 0)) {
        throw new Error('Amount not set');
      }

      // Simulate transaction processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      const destAmount = state.isBuying ? Decimal.from(state.tokenA || 0) : Decimal.from(state.tokenB || 0);
      const sourceAmount = state.isBuying ? Decimal.from(state.tokenB || 0) : Decimal.from(state.tokenA || 0);

      setState(prev => ({
        ...prev,
        successTxData: {
          isBuying: state.isBuying,
          destAmount,
          sourceAmount,
          symbol: tokenToTrade.symbol || '',
          protocolReward: state.isBuying ? Decimal.from(protocolTokenReward()) : undefined,
          protocolSymbol: 'BCL',
          userBalance: Decimal.from(state.userBalance),
        },
        loadingTransaction: false,
      }));

    } catch (error: any) {
      setState(prev => ({
        ...prev,
        errorMessage: error.message,
        loadingTransaction: false,
      }));
    }
  }, [sdk, activeAccount, state.isBuying, state.tokenA, state.tokenB, state.userBalance]);

  return {
    // State
    tokenA: state.tokenA,
    tokenB: state.tokenB,
    tokenAFocused: state.tokenAFocused,
    isBuying: state.isBuying,
    isAllowSelling: state.isAllowSelling,
    loadingTransaction: state.loadingTransaction,
    nextPrice: state.nextPrice,
    userBalance: state.userBalance,
    slippage: state.slippage,
    errorMessage: state.errorMessage,
    successTxData: state.successTxData,
    
    // Computed values
    averageTokenPrice: averageTokenPrice(),
    priceImpactDiff: priceImpactDiff(),
    priceImpactPercent: priceImpactPercent(),
    estimatedNextTokenPriceImpactDifferenceFormattedPercentage: estimatedNextTokenPriceImpactDifferenceFormattedPercentage(),
    protocolTokenReward: protocolTokenReward(),
    spendableAeBalance: spendableAeBalance,
    isInsufficientBalance: isInsufficientBalance(),
    
    // Actions
    resetFormState,
    switchTradeView,
    updateToken,
    setTokenAmount,
    setSlippage,
    placeTokenTradeOrder,
  };
}
