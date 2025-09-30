import { useAccount } from '@/hooks';
import BigNumber from 'bignumber.js';
import { useCallback, useEffect, useRef } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAeSdk } from '../../../hooks/useAeSdk';
import { Decimal } from '../../../libs/decimal';
import {
  calculateBuyPriceWithAffiliationFee,
  calculateSellReturn,
  calculateTokensFromAE,
  toAe,
  toDecimals
} from '../../../utils/bondingCurve';
import { TokenDto } from '../types';
import {
  tokenTradeTokenAtom,
  userBalanceAtom,
  loadingTransactionAtom,
  isBuyingAtom,
  isAllowSellingAtom,
  tokenAAtom,
  tokenBAtom,
  tokenAFocusedAtom,
  nextPriceAtom,
  slippageAtom,
  successTxDataAtom,
  tokenTradeActionsAtom,
  averageTokenPriceAtom,
  priceImpactDiffAtom,
  priceImpactPercentAtom,
  estimatedNextTokenPriceImpactDifferenceFormattedPercentageAtom,
} from '../../../atoms/tokenTradeAtoms';
import {
  setupContractInstance,
  fetchUserTokenBalance,
  getTokenSymbolName,
  getContractInstances,
} from '../libs/tokenTradeContract';
import { CONFIG } from '../../../config';

// Constants from Vue implementation
const PROTOCOL_DAO_AFFILIATION_FEE = 0.05;
const PROTOCOL_DAO_TOKEN_AE_RATIO = 1000;

interface UseTokenTradeProps {
  token: TokenDto;
}

export function useTokenTrade({ token }: UseTokenTradeProps) {
  const { sdk, activeAccount, staticAeSdk } = useAeSdk();
  const { decimalBalance: spendableAeBalance } = useAccount();
  const queryClient = useQueryClient();
  
  // Atoms
  const [tokenA, setTokenA] = useAtom(tokenAAtom);
  const [tokenB, setTokenB] = useAtom(tokenBAtom);
  const [tokenAFocused, setTokenAFocused] = useAtom(tokenAFocusedAtom);
  const [isBuying, setIsBuying] = useAtom(isBuyingAtom);
  const [isAllowSelling, setIsAllowSelling] = useAtom(isAllowSellingAtom);
  const [loadingTransaction, setLoadingTransaction] = useAtom(loadingTransactionAtom);
  const [nextPrice, setNextPrice] = useAtom(nextPriceAtom);
  const [userBalance, setUserBalance] = useAtom(userBalanceAtom);
  const [slippage, setSlippage] = useAtom(slippageAtom);
  const [successTxData, setSuccessTxData] = useAtom(successTxDataAtom);
  const [storeToken, setStoreToken] = useAtom(tokenTradeTokenAtom);
  
  // Computed values
  const averageTokenPrice = useAtomValue(averageTokenPriceAtom);
  const priceImpactDiff = useAtomValue(priceImpactDiffAtom);
  const priceImpactPercent = useAtomValue(priceImpactPercentAtom);
  const estimatedNextTokenPriceImpactDifferenceFormattedPercentage = useAtomValue(estimatedNextTokenPriceImpactDifferenceFormattedPercentageAtom);
  
  // Actions
  const dispatch = useSetAtom(tokenTradeActionsAtom);

  const tokenRef = useRef<TokenDto>(token);
  const errorMessage = useRef<string | undefined>();

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
      setNextPrice(price);
    } catch (error) {
      console.error('Error calculating bonding curve price:', error);
      setNextPrice(Decimal.ZERO);
    }
  }, [setNextPrice]);

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

  // Setup contract instance when token or SDK changes
  const { data: contractInstances } = useQuery({
    queryKey: ['tokenTrade', 'contractSetup', token.sale_address, !!sdk],
    queryFn: async () => {
      if (!token.sale_address) return null;
      const currentSdk = sdk || staticAeSdk;
      if (!currentSdk) return null;
      
      try {
        return await setupContractInstance(currentSdk, token);
      } catch (error) {
        console.error('Error setting up contract instance:', error);
        return null;
      }
    },
    enabled: !!token.sale_address && !!(sdk || staticAeSdk),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch user balance when account or contract changes
  const { data: fetchedUserBalance } = useQuery({
    queryKey: ['tokenTrade', 'userBalance', token.sale_address, activeAccount],
    queryFn: async () => {
      if (!contractInstances?.tokenSaleInstance || !activeAccount || !token) {
        return '0';
      }
      
      try {
        return await fetchUserTokenBalance(
          contractInstances.tokenSaleInstance,
          token,
          activeAccount
        );
      } catch (error) {
        console.error('Error fetching user balance:', error);
        return '0';
      }
    },
    enabled: !!contractInstances?.tokenSaleInstance && !!activeAccount,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Update user balance when fetched
  useEffect(() => {
    if (fetchedUserBalance !== undefined) {
      dispatch({ type: 'SET_USER_BALANCE', value: fetchedUserBalance });
    }
  }, [fetchedUserBalance, dispatch]);

  // Watch tokenA changes and calculate tokenB automatically
  useEffect(() => {
    if (
      tokenA === undefined ||
      tokenA <= 0 ||
      !tokenAFocused ||
      !tokenRef.current.sale_address ||
      !contractInstances?.tokenSaleInstance
    ) {
      return;
    }

    const calculatedTokenB = calculateTokenCost(
      tokenA,
      isBuying,
      !isBuying
    );

    dispatch({ type: 'SET_TOKEN_B', value: calculatedTokenB });
  }, [tokenA, isBuying, tokenAFocused, calculateTokenCost, contractInstances?.tokenSaleInstance, dispatch]);

  // Watch tokenB changes and calculate tokenA automatically  
  useEffect(() => {
    if (
      tokenB === undefined ||
      tokenB <= 0 ||
      tokenAFocused ||
      !tokenRef.current.sale_address ||
      !contractInstances?.tokenSaleInstance
    ) {
      return;
    }

    const calculatedTokenA = calculateTokenCost(
      tokenB,
      isBuying,
      isBuying
    );

    dispatch({ type: 'SET_TOKEN_A', value: calculatedTokenA });
  }, [tokenB, isBuying, tokenAFocused, calculateTokenCost, contractInstances?.tokenSaleInstance, dispatch]);

  const resetFormState = useCallback(() => {
    dispatch({ type: 'RESET_FORM_DATA' });
    errorMessage.current = undefined;
    dispatch({ type: 'SET_LOADING_TRANSACTION', value: false });
  }, [dispatch]);

  const switchTradeView = useCallback((newIsBuying: boolean) => {
    dispatch({ type: 'SET_IS_BUYING', value: newIsBuying });
    dispatch({ type: 'SET_TOKEN_A', value: undefined });
    dispatch({ type: 'SET_TOKEN_B', value: undefined });
  }, [dispatch]);

  const updateToken = useCallback((newToken: TokenDto) => {
    tokenRef.current = newToken;
    dispatch({ type: 'SET_TOKEN', value: newToken });
    resetFormState();
  }, [resetFormState, dispatch]);

  const setTokenAmount = useCallback((amount: number | undefined, isTokenA: boolean) => {
    if (isTokenA) {
      dispatch({ type: 'SET_TOKEN_A', value: amount });
      dispatch({ type: 'SET_TOKEN_A_FOCUSED', value: true });
    } else {
      dispatch({ type: 'SET_TOKEN_B', value: amount });
      dispatch({ type: 'SET_TOKEN_A_FOCUSED', value: false });
    }
  }, [dispatch]);


  // Calculate protocol DAO reward for buying
  const protocolTokenReward = useCallback((): number => {
    if (!isBuying) return 0;
    const aeValue = isBuying ? tokenA || 0 : tokenB || 0;
    return Math.round(
      (1 - PROTOCOL_DAO_AFFILIATION_FEE) * PROTOCOL_DAO_TOKEN_AE_RATIO * aeValue * 100
    ) / 100;
  }, [isBuying, tokenA, tokenB]);

  // Check if user has insufficient balance
  const isInsufficientBalance = useCallback((): boolean => {
    if (isBuying) {
      return Decimal.from(tokenA || 0).gt(spendableAeBalance);
    } else {
      return Decimal.from(tokenB || 0).gt(Decimal.from(userBalance || '0'));
    }
  }, [isBuying, tokenA, tokenB, spendableAeBalance, userBalance]);

  // Buy tokens
  const buy = useCallback(async () => {
    errorMessage.current = undefined;
    if (!contractInstances?.tokenSaleInstance) {
      errorMessage.current = 'Contract not initialized';
      return;
    }

    if (!tokenB || +tokenB === 0) {
      errorMessage.current = 'Amount not set';
      return;
    }

    dispatch({ type: 'SET_LOADING_TRANSACTION', value: true });
    try {
      const buyResult = await contractInstances.tokenSaleInstance.buy(
        tokenB,
        undefined,
        slippage,
      ) as any;
      
      const mints: any[] = buyResult.decodedEvents.filter((data: any) => data.name === 'Mint');
      const _userBalance = await onTransactionComplete();
      const protocolSymbol = await getTokenSymbolName(
        mints[0].contract.address, 
        CONFIG.MIDDLEWARE_URL
      );
      
      dispatch({ type: 'SET_SUCCESS_TX_DATA', value: {
        isBuying: true,
        destAmount: Decimal.from(toAe(mints.at(-1).args[1])),
        sourceAmount: Decimal.from(
          toAe(buyResult.decodedEvents.find((data: any) => data.name === 'Buy').args[0]),
        ),
        symbol: token.symbol || '',
        protocolReward: Decimal.from(toAe(mints[0].args[1])),
        protocolSymbol,
        userBalance: Decimal.from(_userBalance),
      }});
    } catch (error: any) {
      errorMessage.current = error?.message;
    }
    dispatch({ type: 'SET_LOADING_TRANSACTION', value: false });
  }, [contractInstances?.tokenSaleInstance, tokenB, slippage, token.symbol, dispatch]);

  // Sell tokens
  const sell = useCallback(async () => {
    errorMessage.current = undefined;
    if (!contractInstances?.tokenSaleInstance) {
      errorMessage.current = 'Contract not initialized';
      return;
    }

    if (!tokenA || +tokenA === 0) {
      errorMessage.current = 'Amount not set';
      return;
    }

    dispatch({ type: 'SET_LOADING_TRANSACTION', value: true });
    try {
      setIsAllowSelling(true);

      const countTokenDecimals = await contractInstances.tokenSaleInstance.createSellAllowance(
        tokenA?.toString(),
      );

      setIsAllowSelling(false);

      const sellResult = await contractInstances.tokenSaleInstance.sellWithExistingAllowance(
        countTokenDecimals,
        slippage,
      ) as any;
      
      const _userBalance = await onTransactionComplete();
      dispatch({ type: 'SET_SUCCESS_TX_DATA', value: {
        isBuying: false,
        destAmount: Decimal.from(
          toAe(sellResult.decodedEvents.find((data: any) => data.name === 'Burn').args[1]),
        ),
        sourceAmount: Decimal.from(
          toAe(sellResult.decodedEvents.find((data: any) => data.name === 'Sell').args[0]),
        ),
        symbol: token.symbol || '',
        userBalance: Decimal.from(_userBalance),
      }});

      await onTransactionComplete();
    } catch (error: any) {
      errorMessage.current = error?.message;
    }
    dispatch({ type: 'SET_LOADING_TRANSACTION', value: false });
  }, [contractInstances?.tokenSaleInstance, tokenA, slippage, token.symbol, dispatch]);

  // Handle transaction completion
  const onTransactionComplete = useCallback(async () => {
    queryClient.invalidateQueries({
      queryKey: ['TokensService.findByAddress', token.sale_address],
    });
    queryClient.invalidateQueries({
      queryKey: ['MiddlewareService.getTxsByScope', token.sale_address],
    });
    
    // Refetch user balance
    if (contractInstances?.tokenSaleInstance && activeAccount) {
      const balance = await fetchUserTokenBalance(
        contractInstances.tokenSaleInstance,
        token,
        activeAccount
      );
      dispatch({ type: 'SET_USER_BALANCE', value: balance });
      return balance;
    }
    return '0';
  }, [queryClient, token.sale_address, contractInstances?.tokenSaleInstance, activeAccount, token, dispatch]);

  const placeTokenTradeOrder = useCallback(async (tokenToTrade: TokenDto) => {
    dispatch({ type: 'SET_LOADING_TRANSACTION', value: true });
    errorMessage.current = undefined;
    
    try {
      if (!sdk || !activeAccount) {
        throw new Error('Wallet not connected');
      }

      // Update token reference and store
      tokenRef.current = tokenToTrade;
      dispatch({ type: 'SET_TOKEN', value: tokenToTrade });

      // Setup contract if needed
      if (contractInstances?.tokenSaleInstance?.address !== tokenToTrade.sale_address) {
        // Contract will be setup by the query hook
        return;
      }

      if (isBuying) {
        await buy();
      } else {
        await sell();
      }
    } catch (error: any) {
      errorMessage.current = error.message;
      dispatch({ type: 'SET_LOADING_TRANSACTION', value: false });
    } finally {
      // Reset form data
      dispatch({ type: 'RESET_FORM_DATA' });
    }
  }, [sdk, activeAccount, contractInstances?.tokenSaleInstance, isBuying, buy, sell, dispatch]);

  return {
    // State
    tokenA,
    tokenB,
    tokenAFocused,
    isBuying,
    isAllowSelling,
    loadingTransaction,
    nextPrice,
    userBalance,
    slippage,
    errorMessage: errorMessage.current,
    successTxData,
    
    // Computed values
    averageTokenPrice,
    priceImpactDiff,
    priceImpactPercent,
    estimatedNextTokenPriceImpactDifferenceFormattedPercentage,
    protocolTokenReward: protocolTokenReward(),
    spendableAeBalance,
    isInsufficientBalance: isInsufficientBalance(),
    
    // Contract instances
    contractInstances,
    
    // Actions
    resetFormState,
    switchTradeView,
    updateToken,
    setTokenAmount,
    setSlippage: setSlippage,
    placeTokenTradeOrder,
    buy,
    sell,
  };
}
