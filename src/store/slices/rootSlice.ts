import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface TokenBalance { token: string; balance: string }

export interface RootStateSlice {
  address: string | null;
  balance: string | number;
  profile: Record<string, any>;
  pinnedItems: any[];
  selectedCurrency: 'eur' | 'usd' | 'cny';
  chainNames: Record<string, string>;
  verifiedUrls: string[];
  graylistedUrls: string[];
  tokenInfo: Record<string, { symbol: string; decimals: number }>;
  tokenBalances: TokenBalance[];
  tokenPrices: Record<string, string>;
  wordRegistry: any[];
  isHiddenContent: boolean;
  cookiesConsent: Record<string, boolean>;
  isNewAccount: boolean;
}

const initialState: RootStateSlice = {
  address: null,
  balance: 0,
  profile: {},
  pinnedItems: [],
  selectedCurrency: 'eur',
  chainNames: {},
  verifiedUrls: [],
  graylistedUrls: [],
  tokenInfo: {},
  tokenBalances: [],
  tokenPrices: {},
  wordRegistry: [],
  isHiddenContent: true,
  cookiesConsent: {},
  isNewAccount: false,
};

const slice = createSlice({
  name: 'root',
  initialState,
  reducers: {
    setAddress(state, action: PayloadAction<string | null>) { state.address = action.payload; },
    resetState(state) {
      state.address = null;
      state.balance = 0;
      state.profile = {};
      state.cookiesConsent = {};
    },
    updateBalance(state, action: PayloadAction<string | number>) { state.balance = action.payload; },
    setUserProfile(state, action: PayloadAction<Record<string, any>>) { state.profile = action.payload; },
    setPinnedItems(state, action: PayloadAction<any[]>) { state.pinnedItems = action.payload; },
    setChainNames(state, action: PayloadAction<Record<string, string>>) { state.chainNames = action.payload; },
    setVerifiedUrls(state, action: PayloadAction<string[]>) { state.verifiedUrls = action.payload; },
    setGraylistedUrls(state, action: PayloadAction<string[]>) { state.graylistedUrls = action.payload; },
    setTokenInfo(state, action: PayloadAction<Record<string, any>>) { state.tokenInfo = action.payload; },
    setWordRegistry(state, action: PayloadAction<any[]>) { state.wordRegistry = action.payload; },
    addTokenBalance(state, action: PayloadAction<TokenBalance>) {
      const map = new Map(state.tokenBalances.map((b) => [b.token, b] as const));
      map.set(action.payload.token, action.payload);
      state.tokenBalances = Array.from(map.values()).sort((a, b) => a.token.localeCompare(b.token));
    },
    addTokenPrice(state, action: PayloadAction<{ token: string; price: string }>) {
      state.tokenPrices[action.payload.token] = action.payload.price;
    },
    setIsHiddenContent(state, action: PayloadAction<boolean>) { state.isHiddenContent = action.payload; },
    setCookiesConsent(state, action: PayloadAction<{ scope: string; status: boolean }>) {
      state.cookiesConsent[action.payload.scope] = action.payload.status;
    },
    setIsNewAccount(state, action: PayloadAction<boolean>) {
      state.isNewAccount = action.payload;
    },
  },
});

export const {
  setAddress,
  updateBalance,
  setUserProfile,
  setPinnedItems,
  setChainNames,
  setVerifiedUrls,
  setGraylistedUrls,
  setTokenInfo,
  setWordRegistry,
  addTokenBalance,
  addTokenPrice,
  setIsHiddenContent,
  setCookiesConsent,
  setIsNewAccount,
  resetState,
} = slice.actions;

export default slice.reducer;


