import { useAccount } from '@/hooks';
import BigNumber from 'bignumber.js';
import { useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAeSdk } from '../../../hooks/useAeSdk';
import { Decimal } from '../../../libs/decimal';
import {
  calculateBuyPrice,
  calculateBuyPriceWithAffiliationFee,
  calculateSellReturn,
  calculateTokensFromAE,
  toAe,
  toDecimals
} from '../../../utils/bondingCurve';
import { TokenDto } from '@/api/generated/models/TokenDto';
import {
  setupContractInstance,
  fetchUserTokenBalance,
  getTokenSymbolName,
  getContractInstances,
} from '../libs/tokenTradeContract';
import { CONFIG } from '../../../config';
import { useTokenTradeStore } from './useTokenTradeStore';

// Constants from Vue implementation
const PROTOCOL_DAO_AFFILIATION_FEE = 0.05;
const PROTOCOL_DAO_TOKEN_AE_RATIO = 1000;

interface UseTokenTradeProps {
  token: TokenDto;
}

export function useTokenTrade({ token }: UseTokenTradeProps) {
  const { sdk, activeAccount, staticAeSdk } = useAeSdk();
  const queryClient = useQueryClient();
  
  // Use the new token trade store
  const store = useTokenTradeStore();

  const tokenRef = useRef<TokenDto>(token);
  const errorMessage = useRef<string | undefined>();

  // Calculate next price using bonding curve
  const calculateNextPrice = useCallback((currentSupply: Decimal) => {
    try {
      const price = Decimal.from(
        toAe(
          calculateBuyPrice(
            new BigNumber(currentSupply.bigNumber),
            new BigNumber(1).multipliedBy(new BigNumber(10).pow(18)),
          ),
        ),
      );
      store.updateNextPrice(price);
    } catch (error) {
      console.error('Error calculating bonding curve price:', error);
      store.updateNextPrice(Decimal.ZERO);
    }
  }, []);

  // Calculate token cost based on bonding curve
  const calculateTokenCost = useCallback((amount?: number, _isBuying = false, _isUsingToken = false): number => {
    const tokenDecimals = tokenRef.current.decimals ?? 18;
    const tokenSupply = new BigNumber(tokenRef.current.total_supply ?? 0);
    let currentSupply = Decimal.from(toAe(tokenSupply.toString()));

    if (!amount || amount <= 0) {
      calculateNextPrice(currentSupply); //
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
      store.updateUserBalance(fetchedUserBalance);
    }
  }, [fetchedUserBalance]);

  // Watch tokenA changes and calculate tokenB automatically
  useEffect(() => {
    if (
      // store.tokenA === undefined ||
      // store.tokenA <= 0 ||
      !store.tokenAFocused ||
      !tokenRef.current.sale_address ||
      !contractInstances?.tokenSaleInstance
    ) {
      return;
    }
    if ( store.tokenA === undefined || store.tokenA <= 0) {
      store.updateTokenB(undefined);
      return;
    }
    const calculatedTokenB = calculateTokenCost(
      store.tokenA,
      store.isBuying,
      !store.isBuying
    );
    console.log('calculatedTokenB', calculatedTokenB);

    store.updateTokenB(calculatedTokenB);
  }, [store.tokenA, store.isBuying, store.tokenAFocused, calculateTokenCost, contractInstances?.tokenSaleInstance]);

  // Watch tokenB changes and calculate tokenA automatically  
  useEffect(() => {
    if (
      store.tokenAFocused ||
      !tokenRef.current.sale_address ||
      !contractInstances?.tokenSaleInstance
    ) {
      return;
    }
    if (store.tokenB === undefined || store.tokenB <= 0) {
      store.updateTokenA(undefined);
      return;
    }
    const calculatedTokenA = calculateTokenCost(
      store.tokenB,
      store.isBuying,
      store.isBuying
    );

    store.updateTokenA(calculatedTokenA);
  }, [store.tokenB, store.isBuying, store.tokenAFocused, calculateTokenCost, contractInstances?.tokenSaleInstance]);

  const resetFormState = useCallback(() => {
    store.resetFormData(true);
    errorMessage.current = undefined;
    store.updateLoadingTransaction(false);
  }, [store]);

  const switchTradeView = useCallback((newIsBuying: boolean) => {
    store.switchTradeView(newIsBuying);
    store.updateTokenA(undefined);
    store.updateTokenB(undefined);
  }, [store]);

  const updateToken = useCallback((newToken: TokenDto) => {
    tokenRef.current = newToken;
    store.updateToken(newToken);
    resetFormState();
  }, [resetFormState, store]);

  const setTokenAmount = useCallback((amount: number | undefined, isTokenA: boolean) => {
    if (isTokenA) {
      store.updateTokenA(amount);
      store.updateTokenAFocused(true);
    } else {
      store.updateTokenB(amount);
      store.updateTokenAFocused(false);
    }
  }, [store]);


  // Calculate protocol DAO reward for buying
  const protocolTokenReward = useCallback((): number => {
    if (!store.isBuying) return 0;
    const aeValue = store.isBuying ? store.tokenA || 0 : store.tokenB || 0;
    return Math.round(
      (1 - PROTOCOL_DAO_AFFILIATION_FEE) * PROTOCOL_DAO_TOKEN_AE_RATIO * aeValue * 100
    ) / 100;
  }, [store.isBuying, store.tokenA, store.tokenB]);

  // Buy tokens
  const buy = useCallback(async () => {
    errorMessage.current = undefined;
    if (!contractInstances?.tokenSaleInstance) {
      errorMessage.current = 'Contract not initialized';
      return;
    }

    if (!store.tokenB || +store.tokenB === 0) {
      errorMessage.current = 'Amount not set';
      return;
    }

    store.updateLoadingTransaction(true);
    try {
      const buyResult = await contractInstances.tokenSaleInstance.buy(
        store.tokenB,
        undefined,
        store.slippage,
      ) as any;
      
      const mints: any[] = buyResult.decodedEvents.filter((data: any) => data.name === 'Mint');
      const _userBalance = await onTransactionComplete();
      const protocolSymbol = await getTokenSymbolName(
        mints[0].contract.address, 
        CONFIG.MIDDLEWARE_URL
      );
      
      store.updateSuccessTxData({
        isBuying: true,
        destAmount: Decimal.from(toAe(mints.at(-1).args[1])),
        sourceAmount: Decimal.from(
          toAe(buyResult.decodedEvents.find((data: any) => data.name === 'Buy').args[0]),
        ),
        symbol: token.symbol || '',
        protocolReward: Decimal.from(toAe(mints[0].args[1])),
        protocolSymbol,
        userBalance: Decimal.from(_userBalance),
      });
    } catch (error: any) {
      errorMessage.current = error?.message;
    }
    store.updateLoadingTransaction(false);
  }, [contractInstances?.tokenSaleInstance, store, token.symbol]);

  // Sell tokens
  const sell = useCallback(async () => {
    errorMessage.current = undefined;
    if (!contractInstances?.tokenSaleInstance) {
      errorMessage.current = 'Contract not initialized';
      return;
    }

    if (!store.tokenA || +store.tokenA === 0) {
      errorMessage.current = 'Amount not set';
      return;
    }

    store.updateLoadingTransaction(true);
    try {
      store.updateIsAllowSelling(true);

      const countTokenDecimals = await contractInstances.tokenSaleInstance.createSellAllowance(
        store.tokenA?.toString(),
      );

      store.updateIsAllowSelling(false);

      const sellResult = await contractInstances.tokenSaleInstance.sellWithExistingAllowance(
        countTokenDecimals,
        store.slippage,
      ) as any;
      
      const _userBalance = await onTransactionComplete();
      store.updateSuccessTxData({
        isBuying: false,
        destAmount: Decimal.from(
          toAe(sellResult.decodedEvents.find((data: any) => data.name === 'Burn').args[1]),
        ),
        sourceAmount: Decimal.from(
          toAe(sellResult.decodedEvents.find((data: any) => data.name === 'Sell').args[0]),
        ),
        symbol: token.symbol || '',
        userBalance: Decimal.from(_userBalance),
      });

      await onTransactionComplete();
    } catch (error: any) {
      errorMessage.current = error?.message;
    }
    store.updateLoadingTransaction(false);
  }, [contractInstances?.tokenSaleInstance, store, token.symbol]);

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
      store.updateUserBalance(balance);
      return balance;
    }
    return '0';
  }, [queryClient, token.sale_address, contractInstances?.tokenSaleInstance, activeAccount, token, store]);

  const placeTokenTradeOrder = useCallback(async (tokenToTrade: TokenDto) => {
    store.updateLoadingTransaction(true);
    errorMessage.current = undefined;
    
    try {
      if (!sdk || !activeAccount) {
        throw new Error('Wallet not connected');
      }

      // Update token reference and store
      tokenRef.current = tokenToTrade;
      store.updateToken(tokenToTrade);

      // Setup contract if needed
      if (contractInstances?.tokenSaleInstance?.address !== tokenToTrade.sale_address) {
        // Contract will be setup by the query hook
        await setupContractInstance(sdk, tokenToTrade);
        return;
      }

      if (store.isBuying) {
        await buy();
      } else {
        await sell();
      }
    } catch (error: any) {
      errorMessage.current = error.message;
      store.updateLoadingTransaction(false);
    } finally {
      // Reset form data
      store.resetFormData();
    }
  }, [sdk, activeAccount, contractInstances?.tokenSaleInstance, store, buy, sell]);

  return {
    // State
    tokenA: store.tokenA,
    tokenB: store.tokenB,
    tokenAFocused: store.tokenAFocused,
    isBuying: store.isBuying,
    isAllowSelling: store.isAllowSelling,
    loadingTransaction: store.loadingTransaction,
    nextPrice: store.nextPrice,
    userBalance: store.userBalance,
    slippage: store.slippage,
    errorMessage: errorMessage.current,
    successTxData: store.successTxData,
    
    // Computed values
    averageTokenPrice: store.averageTokenPrice,
    priceImpactDiff: store.priceImpactDiff,
    priceImpactPercent: store.priceImpactPercent,
    estimatedNextTokenPriceImpactDifferenceFormattedPercentage: store.estimatedNextTokenPriceImpactDifferenceFormattedPercentage,
    protocolTokenReward: protocolTokenReward(),
    spendableAeBalance: store.spendableAeBalance,
    isInsufficientBalance: store.isInsufficientBalance,
    
    // Contract instances
    contractInstances,
    
    // Actions
    resetFormState,
    switchTradeView,
    updateToken,
    setTokenAmount,
    setSlippage: store.updateSlippage,
    placeTokenTradeOrder,
    buy,
    sell,
  };
}
