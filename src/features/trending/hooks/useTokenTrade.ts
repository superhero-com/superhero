import { TokenDto } from '@/api/generated/models/TokenDto';
import { transactionTypeAtom } from '@/atoms/transactionConfirmAtom';
import { CONFIG } from '@/config';
import { TxPayloadType, useTransactionNotification, type TxPayload } from '@/features/transaction-notification';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import BigNumber from 'bignumber.js';
import { useAtom } from 'jotai';
import { useCallback, useEffect, useRef } from 'react';
import { useAeSdk } from '../../../hooks/useAeSdk';
import { Decimal } from '../../../libs/decimal';
import {
  calculateBuyPrice,
  calculateBuyPriceWithAffiliationFee,
  calculateSellReturn,
  calculateTokensFromAE,
  toAe,
  toDecimals,
} from '../../../utils/bondingCurve';
import { PROTOCOL_DAO_AFFILIATION_FEE, PROTOCOL_DAO_TOKEN_AE_RATIO } from '../../../utils/constants';
import {
  fetchUserTokenBalance,
  getContractInstances,
  getTokenSymbolName,
  setupContractInstance,
} from '../libs/tokenTradeContract';
import { useTokenTradeStore } from './useTokenTradeStore';

interface UseTokenTradeProps {
  token: TokenDto;
}

export function useTokenTrade({ token }: UseTokenTradeProps) {
  const {
    sdk, aeSdk, activeAccount, staticAeSdk,
  } = useAeSdk();
  const queryClient = useQueryClient();
  const [, setTransactionType] = useAtom(transactionTypeAtom);
  const {
    notifySubmitted, notifyConfirmed, notifyError,
  } = useTransactionNotification();
  const store = useTokenTradeStore();

  const tokenRef = useRef<TokenDto>(token);
  const errorMessage = useRef<string | undefined>();
  // storeRef lets effects/callbacks always access the latest store without
  // listing `store` (a new object every render) as a reactive dependency.
  const storeRef = useRef(store);
  storeRef.current = store;

  const getConnectedWalletAddress = useCallback(() => {
    // eslint-disable-next-line no-underscore-dangle
    const currentAccounts = (aeSdk as any)?._accounts?.current || {};
    return Object.keys(currentAccounts)[0] as string | undefined;
  }, [aeSdk]);

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
      storeRef.current.updateNextPrice(price);
    } catch (error) {
      console.error('Error calculating bonding curve price:', error);
      storeRef.current.updateNextPrice(Decimal.ZERO);
    }
    // storeRef is a stable ref — intentionally omitted from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calculate token cost based on bonding curve
  const calculateTokenCost = useCallback((
    amount?: number,
    _isBuying = false,
    _isUsingToken = false,
  ): number => {
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
    } else if (_isUsingToken) {
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

    calculateNextPrice(currentSupply);
    return parseFloat(tokenAmountCostDecimal.toString());
  }, [calculateNextPrice]);

  // Update token reference when prop changes
  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  // Setup contract instance when token or SDK changes
  const { data: contractInstances } = useQuery({
    queryKey: ['tokenTrade', 'contractSetup', token.sale_address, !!sdk, activeAccount],
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

  const getTokenSaleInstance = useCallback(
    () => getContractInstances().tokenSaleInstance || contractInstances?.tokenSaleInstance,
    [contractInstances?.tokenSaleInstance],
  );

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
          activeAccount,
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
      storeRef.current.updateUserBalance(fetchedUserBalance);
    }
  }, [fetchedUserBalance]);

  // Watch tokenA changes and calculate tokenB automatically
  useEffect(() => {
    const s = storeRef.current;
    if (
      !s.tokenAFocused
      || !tokenRef.current.sale_address
      || !contractInstances?.tokenSaleInstance
    ) {
      return;
    }
    if (s.tokenA === undefined || s.tokenA <= 0) {
      s.updateTokenB(undefined);
      return;
    }
    const calculatedTokenB = calculateTokenCost(
      s.tokenA,
      s.isBuying,
      !s.isBuying,
    );
    s.updateTokenB(calculatedTokenB);
    // storeRef is stable — use the individual reactive values as deps instead
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.tokenA, store.isBuying, store.tokenAFocused, calculateTokenCost, contractInstances?.tokenSaleInstance]);

  // Watch tokenB changes and calculate tokenA automatically
  useEffect(() => {
    const s = storeRef.current;
    if (
      s.tokenAFocused
      || !tokenRef.current.sale_address
      || !contractInstances?.tokenSaleInstance
    ) {
      return;
    }
    if (s.tokenB === undefined || s.tokenB <= 0) {
      s.updateTokenA(undefined);
      return;
    }
    const calculatedTokenA = calculateTokenCost(
      s.tokenB,
      s.isBuying,
      s.isBuying,
    );
    s.updateTokenA(calculatedTokenA);
    // storeRef is stable — use the individual reactive values as deps instead
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      (1 - PROTOCOL_DAO_AFFILIATION_FEE) * PROTOCOL_DAO_TOKEN_AE_RATIO * aeValue * 100,
    ) / 100;
  }, [store.isBuying, store.tokenA, store.tokenB]);

  // Handle transaction completion
  const onTransactionComplete = useCallback(async () => {
    queryClient.invalidateQueries({
      queryKey: ['TokensService.findByAddress', token.sale_address],
    });
    queryClient.invalidateQueries({
      queryKey: ['MiddlewareService.getTxsByScope', token.sale_address],
    });

    // Refetch user balance
    const saleInstance = getTokenSaleInstance();
    if (saleInstance && activeAccount) {
      const balance = await fetchUserTokenBalance(
        saleInstance,
        token,
        activeAccount,
      );
      store.updateUserBalance(balance);
      return balance;
    }
    return '0';
  }, [queryClient, getTokenSaleInstance, activeAccount, token, store]);

  // Buy tokens: call saleInstance.buy, parse decodedEvents, and update success state directly.
  const buy = useCallback(async () => {
    errorMessage.current = undefined;
    const saleInstance = getTokenSaleInstance();
    if (!saleInstance) {
      errorMessage.current = 'Contract not initialized';
      return;
    }

    if (!store.tokenB || +store.tokenB === 0) {
      errorMessage.current = 'Amount not set';
      return;
    }

    const symbol = tokenRef.current.symbol || tokenRef.current.name || '';
    const buyPayload: TxPayload = {
      type: TxPayloadType.BuyToken,
      tokenName: tokenRef.current.name || '',
      tokenSymbol: symbol,
      coinAmount: String(store.tokenA || 0),
      estimatedTokens: String(store.tokenB),
      saleAddress: tokenRef.current.sale_address,
    };

    store.updateLoadingTransaction(true);
    notifySubmitted(buyPayload);
    try {
      const result = await saleInstance.buy(store.tokenB, undefined, store.slippage) as any;
      const events: any[] = result?.decodedEvents || [];
      const buyEvent = events.find((e: any) => e.name === 'Buy');
      const tokenMintEvent = events.find(
        (e: any) => e.name === 'Mint' && e.contract?.address === tokenRef.current.address,
      );
      const protocolMintEvent = events.find(
        (e: any) => e.name === 'Mint' && e.contract?.address !== tokenRef.current.address,
      );

      const sourceAmount = Decimal.from(toAe(buyEvent?.args[0] || '0'));
      const destAmount = Decimal.from(toAe(tokenMintEvent?.args[1] || '0'));
      const protocolReward = protocolMintEvent
        ? Decimal.from(toAe(protocolMintEvent.args[1]))
        : undefined;
      const protocolSymbol = protocolMintEvent
        ? await getTokenSymbolName(protocolMintEvent.contract.address, CONFIG.MIDDLEWARE_URL)
        : undefined;

      const balance = await onTransactionComplete();
      store.updateSuccessTxData({
        isBuying: true,
        symbol,
        protocolSymbol,
        sourceAmount,
        destAmount,
        protocolReward,
        userBalance: Decimal.from(balance),
      });
      notifyConfirmed(buyPayload);
    } catch (error: any) {
      errorMessage.current = error?.message;
      notifyError(error?.message || 'Buy transaction failed');
    }
    store.updateLoadingTransaction(false);
  }, [getTokenSaleInstance, onTransactionComplete, store, notifySubmitted, notifyConfirmed, notifyError]);

  // Sell tokens
  const sell = useCallback(async () => {
    errorMessage.current = undefined;
    const saleInstance = getTokenSaleInstance();
    if (!saleInstance) {
      errorMessage.current = 'Contract not initialized';
      return;
    }

    if (!store.tokenA || +store.tokenA === 0) {
      errorMessage.current = 'Amount not set';
      return;
    }

    const symbol = tokenRef.current.symbol || tokenRef.current.name || '';

    store.updateLoadingTransaction(true);
    try {
      store.updateIsAllowSelling(true);

      notifySubmitted({
        type: TxPayloadType.ApproveAllowance,
        tokenName: tokenRef.current.name || '',
        tokenSymbol: symbol,
        amount: String(store.tokenA),
        stepNumber: 1,
        totalSteps: 2,
      });

      const countTokenDecimals = await saleInstance.createSellAllowance(
        store.tokenA?.toString(),
      );

      store.updateIsAllowSelling(false);

      const sellPayload: TxPayload = {
        type: TxPayloadType.SellToken,
        tokenName: tokenRef.current.name || '',
        tokenSymbol: symbol,
        tokenAmount: String(store.tokenA),
        estimatedCoin: String(store.tokenB || 0),
        saleAddress: tokenRef.current.sale_address,
      };
      notifySubmitted(sellPayload);

      const sellResult = await saleInstance.sellWithExistingAllowance(
        countTokenDecimals,
        store.slippage,
      ) as any;

      const userBalanceValue = await onTransactionComplete();
      store.updateSuccessTxData({
        isBuying: false,
        destAmount: Decimal.from(
          toAe(sellResult.decodedEvents.find((data: any) => data.name === 'Burn').args[1]),
        ),
        sourceAmount: Decimal.from(
          toAe(sellResult.decodedEvents.find((data: any) => data.name === 'Sell').args[0]),
        ),
        symbol: token.symbol || '',
        userBalance: Decimal.from(userBalanceValue),
      });
      notifyConfirmed(sellPayload);

      await onTransactionComplete();
    } catch (error: any) {
      errorMessage.current = error?.message;
      notifyError(error?.message || 'Sell transaction failed');
    }
    store.updateLoadingTransaction(false);
  }, [getTokenSaleInstance, store, token.symbol, onTransactionComplete, notifySubmitted, notifyConfirmed, notifyError]);

  const placeTokenTradeOrder = useCallback(async (tokenToTrade: TokenDto) => {
    setTransactionType('trade');
    store.setDesiredSlippage(store.slippage);
    store.updateLoadingTransaction(true);
    errorMessage.current = undefined;

    try {
      const connectedWalletAddress = getConnectedWalletAddress();
      const normalizedActiveAccount = typeof activeAccount === 'string' && activeAccount.startsWith('ak_')
        ? activeAccount
        : undefined;
      const normalizedConnectedWalletAddress = typeof connectedWalletAddress === 'string' && connectedWalletAddress.startsWith('ak_')
        ? connectedWalletAddress
        : undefined;

      // After refresh, wallet account sync can lag behind persisted account state.
      // Prefer wallet signer when available, otherwise fallback to static/deeplink signer.
      const signingSdk = normalizedConnectedWalletAddress ? aeSdk : staticAeSdk;
      if (!signingSdk || !normalizedActiveAccount) {
        throw new Error('Wallet not connected');
      }

      tokenRef.current = tokenToTrade;
      store.updateToken(tokenToTrade);

      // Rebind contract calls to the signer SDK selected above.
      // This prevents undefined signer state right after page refresh.
      await setupContractInstance(signingSdk, tokenToTrade);

      // Fire-and-forget: buy/sell run with the same SDK we used for setup.
      if (store.isBuying) {
        buy().finally(() => {
          setTransactionType(null);
          store.updateLoadingTransaction(false);
          store.resetFormData();
        });
      } else {
        sell().finally(() => {
          setTransactionType(null);
          store.updateLoadingTransaction(false);
          store.resetFormData();
        });
      }
    } catch (error: any) {
      errorMessage.current = error.message;
      store.updateLoadingTransaction(false);
      setTransactionType(null);
      store.resetFormData();
    }
  }, [aeSdk, staticAeSdk, activeAccount, getConnectedWalletAddress, store, buy, sell, setTransactionType]);

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
