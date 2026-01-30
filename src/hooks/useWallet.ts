import { useAtom } from 'jotai';
import { useCallback } from 'react';
import {
  addressAtom,
  balanceAtom,
  selectedCurrencyAtom,
  tokenBalancesAtom,
  tokenPricesAtom,
  cookiesConsentAtom,
  profileAtom,
  pinnedItemsAtom,
  chainNamesAtom,
  selectedChainAtom,
  verifiedUrlsAtom,
  graylistedUrlsAtom,
  tokenInfoAtom,
  wordRegistryAtom,
  isHiddenContentAtom,
  isNewAccountAtom,
  isConnectedAtom,
  hasBalanceAtom,
  TokenBalance,
} from '../atoms/walletAtoms';

export const useWallet = () => {
  const [address, setAddress] = useAtom(addressAtom);
  const [balance, setBalance] = useAtom(balanceAtom);
  const [selectedCurrency] = useAtom(selectedCurrencyAtom);
  const [tokenBalances, setTokenBalances] = useAtom(tokenBalancesAtom);
  const [tokenPrices, setTokenPrices] = useAtom(tokenPricesAtom);
  const [cookiesConsent, setCookiesConsent] = useAtom(cookiesConsentAtom);
  const [profile, setProfile] = useAtom(profileAtom);
  const [pinnedItems, setPinnedItems] = useAtom(pinnedItemsAtom);
  const [chainNames, setChainNames] = useAtom(chainNamesAtom);
  const [selectedChain, setSelectedChain] = useAtom(selectedChainAtom);
  const [verifiedUrls, setVerifiedUrls] = useAtom(verifiedUrlsAtom);
  const [graylistedUrls, setGraylistedUrls] = useAtom(graylistedUrlsAtom);
  const [tokenInfo, setTokenInfo] = useAtom(tokenInfoAtom);
  const [wordRegistry, setWordRegistry] = useAtom(wordRegistryAtom);
  const [isHiddenContent, setIsHiddenContent] = useAtom(isHiddenContentAtom);
  const [isNewAccount, setIsNewAccount] = useAtom(isNewAccountAtom);
  const [isConnected] = useAtom(isConnectedAtom);
  const [hasBalance] = useAtom(hasBalanceAtom);

  const resetState = useCallback(() => {
    setAddress(null);
    setBalance(0);
    setProfile({});
    setCookiesConsent({});
  }, [setAddress, setBalance, setProfile, setCookiesConsent]);

  const addTokenBalance = useCallback((tokenBalance: TokenBalance) => {
    setTokenBalances(prev => {
      const map = new Map(prev.map((b) => [b.token, b] as const));
      map.set(tokenBalance.token, tokenBalance);
      return Array.from(map.values()).sort((a, b) => a.token.localeCompare(b.token));
    });
  }, [setTokenBalances]);

  const addTokenPrice = useCallback((token: string, price: string) => {
    setTokenPrices(prev => ({
      ...prev,
      [token]: price,
    }));
  }, [setTokenPrices]);

  const setCookieConsent = useCallback((scope: string, status: boolean) => {
    setCookiesConsent(prev => ({
      ...prev,
      [scope]: status,
    }));
  }, [setCookiesConsent]);

  return {
    // State
    address,
    balance,
    selectedCurrency,
    tokenBalances,
    tokenPrices,
    cookiesConsent,
    profile,
    pinnedItems,
    chainNames,
    selectedChain,
    verifiedUrls,
    graylistedUrls,
    tokenInfo,
    wordRegistry,
    isHiddenContent,
    isNewAccount,
    isConnected,
    hasBalance,
    
    // Actions
    setAddress,
    setBalance,
    setProfile,
    setPinnedItems,
    setChainNames,
    setSelectedChain,
    setVerifiedUrls,
    setGraylistedUrls,
    setTokenInfo,
    setWordRegistry,
    setIsHiddenContent,
    setIsNewAccount,
    resetState,
    addTokenBalance,
    addTokenPrice,
    setCookieConsent,
  };
};
