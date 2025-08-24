import { useAtom } from 'jotai';
import { useCallback } from 'react';
import {
  AeSdk,
  AeSdkAepp,
  BrowserWindowMessageConnection,
  hash,
  MemoryAccount,
  Node,
  walletDetector,
} from '@aeternity/aepp-sdk';
import { CONFIG } from '../config';
import { sdkAtom, useSdkWalletAtom, useIframeWalletAtom, sdkConnectedAtom } from '../atoms/aeternityAtoms';
import { useWallet } from './useWallet';

// ACIs for contracts
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

// Ensure singletons across hot reloads / StrictMode
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  interface Window {
    __aeSdk?: any;
    __walletScanStop?: (() => void) | null;
    __walletScanPromise?: Promise<string | null> | null;
  }
}

export const useAeternity = () => {
  const [sdk, setSdk] = useAtom(sdkAtom);
  const [useSdkWallet, setUseSdkWallet] = useAtom(useSdkWalletAtom);
  const [useIframeWallet, setUseIframeWallet] = useAtom(useIframeWalletAtom);
  const [sdkConnected] = useAtom(sdkConnectedAtom);
  const { setAddress, setBalance, resetState, setIsNewAccount } = useWallet();

  const initSdk = useCallback(async () => {
    // Reuse existing instance to avoid duplicating RPC clients under StrictMode
    if (window.__aeSdk) {
      // eslint-disable-next-line no-console
      console.info('[wallet] Reusing existing SDK instance');
      setSdk({ connected: true });
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
          setAddress(address);
        },
      });
    }
    
    // Store instance globally and in atom
    window.__aeSdk = instance;
    setSdk({ connected: true });
    return { instance };
  }, [setSdk, setAddress]);

  const scanForWallets = useCallback(async () => {
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
      setUseIframeWallet(true);
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
        setAddress(address);
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
  }, [setAddress, setUseIframeWallet]);

  const refreshAeBalance = useCallback(async () => {
    const sdk = window.__aeSdk as AeSdk;
    if (!sdk) return null;
    
    // Get current address from wallet hook
    const address = sdk.addresses?.()?.[0];
    if (!address) return null;

    try {
      // eslint-disable-next-line no-console
      console.info('[wallet] Refreshing balance for', address);
      const aettos = await sdk.getBalance(address);
      const ae = Number(aettos) / 1e18;
      setBalance(ae);
      // eslint-disable-next-line no-console
      console.info('[wallet] Balance updated', ae, 'AE');
      return ae;
    } catch (error: any) {
      setBalance(0);
      
      // Enhanced error logging for new accounts
      if (error?.message?.includes('404') || error?.status === 404) {
        console.info('[wallet] New account detected:', address);
        console.info('[wallet] Account not found on blockchain - this is normal for new accounts');
        console.info('[wallet] User needs to bridge ETH to get started with æternity');
        
        // Mark as new account
        setIsNewAccount(true);
      } else {
        // eslint-disable-next-line no-console
        console.warn('[wallet] Failed to refresh balance:', error?.message || error);
      }
      return 0;
    }
  }, [setBalance, setIsNewAccount]);

  const logout = useCallback(async () => {
    const sdk = window.__aeSdk as AeSdkAepp | undefined;
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
    setAddress(null);
    setBalance(0);
    resetState();
    // eslint-disable-next-line no-console
    console.info('[wallet] Logged out');
  }, [setAddress, setBalance, resetState]);

  const enableIframeWallet = useCallback(() => {
    setUseIframeWallet(true);
  }, [setUseIframeWallet]);

  const enableSdkWallet = useCallback(() => {
    setUseSdkWallet(true);
  }, [setUseSdkWallet]);

  // Contract helpers
  const initTippingContracts = useCallback(async () => {
    const sdk = window.__aeSdk;
    if (!sdk) throw new Error('Init sdk first');
    const list = [
      [TIPPING_V1_ACI, CONFIG.CONTRACT_V1_ADDRESS],
      [TIPPING_V2_ACI, CONFIG.CONTRACT_V2_ADDRESS],
      [TIPPING_V3_ACI, CONFIG.CONTRACT_V3_ADDRESS],
    ];
    const instances = await Promise.all(list.map(async ([aci, address]) => (
      address ? sdk.initializeContract({ aci, address }) : null
    )));
    return instances;
  }, []);

  const initFungibleTokenContract = useCallback(async (contractAddress: string) => {
    const sdk = window.__aeSdk;
    return sdk.initializeContract({ 
      aci: (FUNGIBLE_TOKEN_ACI as any)?.contract ?? FUNGIBLE_TOKEN_ACI, 
      address: contractAddress 
    });
  }, []);

  const postWithoutTipSignature = useCallback(async ({ title, media }: { title: string; media: string }) => {
    const message = tippingContractUtil.postWithoutTippingString(title, media);
    const hashBuffer = hash(message);
    return hashBuffer.toString('hex');
  }, []);

  const createOrChangeAllowance = useCallback(async ({ 
    contractAddress, 
    amount, 
    forAccount 
  }: { 
    contractAddress: string; 
    amount: number; 
    forAccount?: string | null;
  }) => {
    const sdk = window.__aeSdk;
    const contract = await sdk.initializeContract({ 
      aci: (FUNGIBLE_TOKEN_ACI as any)?.contract ?? FUNGIBLE_TOKEN_ACI, 
      address: contractAddress 
    });
    const { decodedResult } = await contract.allowance({
      from_account: sdk.address,
      for_account: forAccount || (CONFIG.CONTRACT_V2_ADDRESS as string).replace('ct_', 'ak_'),
    });
    const allowanceAmount = decodedResult !== undefined
      ? Number(decodedResult) * -1 + amount
      : amount;
    const method = decodedResult !== undefined ? 'change_allowance' : 'create_allowance';
    return contract[method](forAccount || (CONFIG.CONTRACT_V2_ADDRESS as string).replace('ct_', 'ak_'), allowanceAmount);
  }, []);

  const tokenBalance = useCallback(async ({ 
    contractAddress, 
    address 
  }: { 
    contractAddress: string; 
    address: string;
  }) => {
    const sdk = window.__aeSdk;
    const contract = await sdk.initializeContract({ 
      aci: (FUNGIBLE_TOKEN_ACI as any)?.contract ?? FUNGIBLE_TOKEN_ACI, 
      address: contractAddress 
    });
    const { decodedResult } = await (contract as any).balance(address);
    return decodedResult as string;
  }, []);

  const getAeSdk = useCallback(() => {
    return window.__aeSdk;
  }, []);

  return {
    // State
    sdk,
    useSdkWallet,
    useIframeWallet,
    sdkConnected,
    getAeSdk,
    // Actions
    initSdk,
    scanForWallets,
    refreshAeBalance,
    logout,
    enableIframeWallet,
    enableSdkWallet,
    
    // Contract helpers
    initTippingContracts,
    initFungibleTokenContract,
    postWithoutTipSignature,
    createOrChangeAllowance,
    tokenBalance,
  };
};
