/* globals Cypress */
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  AeSdk,
  AeSdkAepp,
  BrowserWindowMessageConnection,
  hash,
  MemoryAccount,
  Node,
  walletDetector,
} from '@aeternity/aepp-sdk';
// ACIs and sources for contracts
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import TIPPING_V1_ACI from 'tipping-contract/generated/Tipping_v1.aci.json';
// @ts-ignore
import TIPPING_V2_ACI from 'tipping-contract/generated/Tipping_v2.aci.json';
// @ts-ignore
import TIPPING_V3_ACI from 'tipping-contract/generated/Tipping_v3.aci.json';
// @ts-ignore
import tippingContractUtil from 'tipping-contract/util/tippingContractUtil';
// @ts-ignore
import FUNGIBLE_TOKEN_ACI from 'aeternity-fungible-token/generated/FungibleTokenFull.aci.json';
// @ts-ignore
import FUNGIBLE_TOKEN_CONTRACT from 'aeternity-fungible-token/FungibleTokenFull.aes?raw';
// WordBazaar and bonding curve contracts removed in React port
import { CONFIG } from '../../config';
import { resetState, updateBalance } from './rootSlice';

// Ensure singletons across hot reloads / StrictMode
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  interface Window {
    __aeSdk?: any;
    __walletScanStop?: (() => void) | null;
    __walletScanPromise?: Promise<string | null> | null;
  }
}

interface AeternityState {
  sdk: any | null;
  useSdkWallet: boolean;
  useIframeWallet: boolean;
}

const initialState: AeternityState = {
  sdk: null,
  useSdkWallet: false,
  useIframeWallet: false,
};

export const initSdk = createAsyncThunk('aeternity/initSdk', async (_, { dispatch }) => {
  // Reuse existing instance to avoid duplicating RPC clients under StrictMode
  if (window.__aeSdk) {
    // eslint-disable-next-line no-console
    console.info('[wallet] Reusing existing SDK instance');
    return { instance: window.__aeSdk };
  }

  const options = { nodes: [{ name: 'node', instance: new Node(CONFIG.NODE_URL) }] };
  let instance: any;
  if ((window as any).Cypress) {
    instance = new AeSdk({
      ...options,
      accounts: [new MemoryAccount((window as any).Cypress.env('privateKey'))],
    });
    instance.addresses = () => ([(window as any).Cypress.env('publicKey')]);
  } else {
    // eslint-disable-next-line no-console
    console.info('[wallet] Creating AeSdkAepp instance targeting', CONFIG.NODE_URL);
    instance = new AeSdkAepp({
      ...options,
      name: 'Superhero',
      onDisconnect() { /* noop: state reset handled at app layer */
        // eslint-disable-next-line no-console
        console.info('[wallet] Disconnected from wallet');
      },
      async onAddressChange(accounts: any) {
        const address = Object.keys(accounts.current)[0];
        // eslint-disable-next-line no-console
        console.info('[wallet] Address changed', address);
        dispatch({ type: 'root/setAddress', payload: address });
      },
    });
  }
  return { instance };
});

export const scanForWallets = createAsyncThunk('aeternity/scanForWallets', async (_, { dispatch }) => {
  const sdk = window.__aeSdk;
  if (!sdk) throw new Error('SDK not initialized');

  // Deduplicate concurrent scans
  if (window.__walletScanPromise) {
    // eslint-disable-next-line no-console
    console.info('[wallet] Scan already in progress');
    return window.__walletScanPromise;
  }

  // Stop any previous scanner before starting a new one
  if (window.__walletScanStop) {
    try { window.__walletScanStop(); } catch {}
    window.__walletScanStop = null;
  }

  // eslint-disable-next-line no-console
  console.info('[wallet] Starting wallet scan…');
  let resolveFn: (v: string | null) => void = () => {};
  let rejectFn: (e: any) => void = (e) => { throw e; };

  const webWalletTimeout = /Mobi/.test(navigator.userAgent) ? 0 : window.setTimeout(() => {
    // eslint-disable-next-line no-console
    console.info('[wallet] Web Wallet not detected quickly, enabling iframe wallet prompt');
    dispatch(enableIframeWallet());
  }, 10000);

  async function handleNewWallet({ newWallet }: any) {
    try {
      clearTimeout(webWalletTimeout);
      // eslint-disable-next-line no-console
      console.info('[wallet] Wallet detected, connecting…');
      const connection = await newWallet.getConnection();
      await sdk.connectToWallet(connection);
      await sdk.subscribeAddress('subscribe', 'current');
      const address = sdk.addresses()[0];
      if (!address) return null;
      if (window.__walletScanStop) window.__walletScanStop();
      // eslint-disable-next-line no-console
      console.info('[wallet] Connected, current address', address);
      dispatch({ type: 'root/setAddress', payload: address });
      resolveFn(address);
      return address;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[wallet] Wallet connection failed', e);
      rejectFn(e);
      return null;
    }
  }

  const scannerConnection = new BrowserWindowMessageConnection();
  const stopScan = walletDetector(scannerConnection, handleNewWallet);
  window.__walletScanStop = stopScan;

  window.__walletScanPromise = new Promise<string | null>((resolve, reject) => {
    resolveFn = (v) => { window.__walletScanPromise = null; resolve(v); };
    rejectFn = (e) => { window.__walletScanPromise = null; reject(e); };
  });

  window.__walletScanPromise.finally(() => {
    // eslint-disable-next-line no-console
    console.info('[wallet] Wallet scan finished');
  });

  return window.__walletScanPromise;
});

const slice = createSlice({
  name: 'aeternity',
  initialState,
  reducers: {
    setSdk(state, action: PayloadAction<{ instance: any }>) { state.sdk = action.payload.instance; },
    useSdkWallet(state) { state.useSdkWallet = true; },
    enableIframeWallet(state) { state.useIframeWallet = true; },
  },
  extraReducers(builder) {
    builder.addCase(initSdk.fulfilled, (state, action) => {
      // Avoid storing non-serializable instance in Redux state; attach to window instead
      (window as any).__aeSdk = action.payload.instance;
      state.sdk = { connected: true } as any;
    // eslint-disable-next-line no-console
    console.info('[wallet] SDK initialized');
    });
  },
});

export const { setSdk, useSdkWallet, enableIframeWallet } = slice.actions;
export default slice.reducer;

// Contract helpers and on-chain actions
export const initTippingContracts = createAsyncThunk(
  'aeternity/initTippingContracts',
  async (_, { getState }) => {
    const { aeternity } = getState() as any;
    const sdk = aeternity.sdk;
    if (!sdk) throw new Error('Init sdk first');
    const list = [
      [TIPPING_V1_ACI, CONFIG.CONTRACT_V1_ADDRESS],
      [TIPPING_V2_ACI, CONFIG.CONTRACT_V2_ADDRESS],
      [TIPPING_V3_ACI, CONFIG.CONTRACT_V3_ADDRESS],
    ];
    const instances = await Promise.all(list.map(async ([aci, address]) => (
      address ? sdk.initializeContract({ aci, address }) : null
    )));
    return instances as any[];
  },
);

export const initFungibleTokenContract = createAsyncThunk(
  'aeternity/initFungibleTokenContract',
  async (contractAddress: string, { getState }) => {
    const { aeternity } = getState() as any;
    return aeternity.sdk.initializeContract({ aci: (FUNGIBLE_TOKEN_ACI as any)?.contract ?? FUNGIBLE_TOKEN_ACI, address: contractAddress });
  },
);

// Removed WordBazaar helpers

export const postWithoutTipSignature = createAsyncThunk('aeternity/postWithoutTipSignature', async ({ title, media }: { title: string; media: string }) => {
  const message = tippingContractUtil.postWithoutTippingString(title, media);
  const hashBuffer = hash(message);
  // We need sdk from state to sign, but return only hash and let caller sign via sdk
  return hashBuffer.toString('hex');
});

export const tip = createAsyncThunk('aeternity/tip', async (
  { url, title, amount, tokenAddress }: { url: string; title: string; amount: number; tokenAddress?: string | null },
  { dispatch, getState },
) => {
  throw new Error('Tipping is not supported in this React port');
});

export const retip = createAsyncThunk('aeternity/retip', async (
  { contractAddress, id, amount, tokenAddress }: { contractAddress: string; id: string; amount: number; tokenAddress?: string | null },
  { dispatch },
) => {
  throw new Error('Retip is not supported in this React port');
});

export const postWithoutTip = createAsyncThunk('aeternity/postWithoutTip', async (
  { title, media }: { title: string; media: string },
  { dispatch },
) => {
  throw new Error('Posting is not supported without tipping contracts in this React port');
});

export const createOrChangeAllowance = createAsyncThunk('aeternity/createOrChangeAllowance', async (
  { contractAddress, amount, forAccount }: { contractAddress: string; amount: number; forAccount?: string | null },
  { getState },
) => {
  const { aeternity } = getState() as any;
  const sdk = aeternity.sdk;
  const contract = await sdk.initializeContract({ aci: (FUNGIBLE_TOKEN_ACI as any)?.contract ?? FUNGIBLE_TOKEN_ACI, address: contractAddress });
  const { decodedResult } = await contract.allowance({
    from_account: sdk.address,
    for_account: forAccount || (CONFIG.CONTRACT_V2_ADDRESS as string).replace('ct_', 'ak_'),
  });
  const allowanceAmount = decodedResult !== undefined
    ? Number(decodedResult) * -1 + amount
    : amount;
  const method = decodedResult !== undefined ? 'change_allowance' : 'create_allowance';
  return contract[method](forAccount || (CONFIG.CONTRACT_V2_ADDRESS as string).replace('ct_', 'ak_'), allowanceAmount);
});

// Removed WordBazaar deployment helpers

export const tokenBalance = createAsyncThunk('aeternity/tokenBalance', async (
  { contractAddress, address }: { contractAddress: string; address: string },
) => {
  const sdk = (window as any).__aeSdk;
  const contract = await sdk.initializeContract({ aci: (FUNGIBLE_TOKEN_ACI as any)?.contract ?? FUNGIBLE_TOKEN_ACI, address: contractAddress });
  const { decodedResult } = await (contract as any).balance(address);
  return decodedResult as string;
});

// Fetch AE balance for current account
export const refreshAeBalance = createAsyncThunk('aeternity/refreshAeBalance', async (_, { getState, dispatch }) => {
  const state = getState() as any;
  const address: string | null = state.root.address;
  const sdk = (window as any).__aeSdk as AeSdk;
  if (!sdk || !address) return null;
  try {
    // eslint-disable-next-line no-console
    console.info('[wallet] Refreshing balance for', address);
    const aettos = await sdk.getBalance(address);
    const ae = Number(aettos) / 1e18;
    dispatch(updateBalance(ae));
    // eslint-disable-next-line no-console
    console.info('[wallet] Balance updated', ae, 'AE');
    return ae;
  } catch (error: any) {
    dispatch(updateBalance(0));
    
    // Enhanced error logging for new accounts
    if (error?.message?.includes('404') || error?.status === 404) {
      console.info('[wallet] New account detected:', address);
      console.info('[wallet] Account not found on blockchain - this is normal for new accounts');
      console.info('[wallet] User needs to bridge ETH to get started with æternity');
      
      // Dispatch action to mark as new account
      dispatch({ type: 'root/setIsNewAccount', payload: true });
    } else {
      // eslint-disable-next-line no-console
      console.warn('[wallet] Failed to refresh balance:', error?.message || error);
    }
    return 0;
  }
});

// Logout helper: disconnect wallet and clear state
export const logout = createAsyncThunk('aeternity/logout', async (_, { dispatch }) => {
  const sdk = (window as any).__aeSdk as AeSdkAepp | undefined;
  try {
    if (sdk && typeof (sdk as any).disconnectWallet === 'function') {
      // eslint-disable-next-line no-console
      console.info('[wallet] Disconnecting wallet…');
      (sdk as any).disconnectWallet();
    }
  } catch {}
  try {
    if (window.__walletScanStop) window.__walletScanStop();
  } catch {}
  window.__walletScanStop = null;
  window.__walletScanPromise = null;
  dispatch({ type: 'root/setAddress', payload: null });
  dispatch(updateBalance(0));
  dispatch(resetState());
  // eslint-disable-next-line no-console
  console.info('[wallet] Logged out');
});


