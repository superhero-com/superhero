import { AeSdk, AeSdkAepp } from '@aeternity/aepp-sdk';
import BigNumber from 'bignumber.js';
import { BrowserProvider } from 'ethers';
import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { useAeSdk } from '../../../hooks/useAeSdk';
import { getTokenBalance } from '../../../libs/dex';
import { BridgeConstants } from '../constants';
import * as Ethereum from '../services/ethereum';
import { fetchAddressInfo, getAllTokenBalancesFromEthplorer } from '../services/ethplorer';
import { Asset, Direction } from '../types';

interface UseTokenBalancesProps {
  assets: Asset[];
  direction: Direction;
  aeAccount?: string;
  ethAccount?: string;
  sdk?: AeSdk | AeSdkAepp;
}

export function useTokenBalances({
  assets, direction, aeAccount, ethAccount, sdk,
}: UseTokenBalancesProps) {
  const [aeBalances, setAeBalances] = useState<Record<string, string>>({});
  const [ethBalances, setEthBalances] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [ethLoading, setEthLoading] = useState(false);
  const [aeLoading, setAeLoading] = useState(false);
  const isFetchingRef = useRef(false);
  const isEthFetchingRef = useRef(false);
  const isAeFetchingRef = useRef(false);
  const assetsRef = useRef(assets);
  const sdkRef = useRef(sdk);
  const aeAccountRef = useRef(aeAccount);
  const ethAccountRef = useRef(ethAccount);

  // Get activeNetwork from useAeSdk hook
  const { activeNetwork } = useAeSdk();

  // Helper function to load AEX-9 data from middleware (same as useAccountBalances)
  const _loadAex9DataFromMdw = useCallback(async (url: string, items: any[] = []) => {
    const fetchUrl = `${activeNetwork.middlewareUrl}${url}`;
    const response = await fetch(fetchUrl);
    const data = await response.json();

    if (data.next) {
      return _loadAex9DataFromMdw(data.next, items.concat(data.data));
    }
    return items.concat(data.data);
  }, [activeNetwork.middlewareUrl]);

  // Update refs
  useEffect(() => {
    assetsRef.current = assets;
    sdkRef.current = sdk;
    aeAccountRef.current = aeAccount;
    ethAccountRef.current = ethAccount;
  }, [assets, sdk, aeAccount, ethAccount]);

  // Separate function to fetch Ethereum balances
  const fetchEthereumBalances = useCallback(async () => {
    const currentAssets = assetsRef.current;
    const currentEthAccount = ethAccountRef.current;

    if (!currentAssets.length || !currentEthAccount) {
      setEthLoading(false);
      return;
    }

    // Prevent concurrent fetches
    if (isEthFetchingRef.current) {
      return;
    }

    isEthFetchingRef.current = true;
    setEthLoading(true);
    const newEthBalances: Record<string, string> = {};

    try {
      // Try to fetch balances using Ethplorer API first
      try {
        const ethplorerData = await fetchAddressInfo(currentEthAccount);
        const ethplorerBalances = getAllTokenBalancesFromEthplorer(ethplorerData, currentAssets, BridgeConstants.ethereum.default_eth);

        // Merge Ethplorer balances into newEthBalances
        Object.assign(newEthBalances, ethplorerBalances);
      } catch (ethplorerError) {
        // Fallback to individual contract calls
        if (!(window as any).ethereum) return;

        const provider = new BrowserProvider((window as any).ethereum, {
          name: 'Ethereum Bridge',
          chainId: parseInt(BridgeConstants.ethereum.ethChainId, 16),
        });
        const signer = await provider.getSigner();
        const userAddress = await signer.getAddress();

        await Promise.all(
          currentAssets.map(async (asset) => {
            try {
              if (asset.ethAddress === BridgeConstants.ethereum.default_eth) {
                // Native ETH
                const balance = await provider.getBalance(userAddress);
                const balanceFormatted = new BigNumber(balance.toString())
                  .shiftedBy(-18)
                  .toFixed(6, BigNumber.ROUND_DOWN);
                newEthBalances[asset.symbol] = balanceFormatted;
              } else {
                // ERC-20 token
                try {
                  const tokenContract = new Ethereum.Contract(
                    asset.ethAddress,
                    BridgeConstants.ethereum.asset_abi,
                    signer,
                  );

                  // Simple timeout approach
                  const balancePromise = tokenContract.balanceOf(userAddress);
                  const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error(`Balance fetch timeout for ${asset.symbol}`)), 8000));

                  const balance = await Promise.race([balancePromise, timeoutPromise]);
                  const balanceFormatted = new BigNumber(balance.toString())
                    .shiftedBy(-asset.decimals)
                    .toFixed(6, BigNumber.ROUND_DOWN);
                  newEthBalances[asset.symbol] = balanceFormatted;
                } catch (error) {
                  newEthBalances[asset.symbol] = '0';
                }
              }
            } catch (error) {
              newEthBalances[asset.symbol] = '0';
            }
          }),
        );
      }
    } catch (error) {
    } finally {
      setEthBalances(newEthBalances);
      setEthLoading(false);
      isEthFetchingRef.current = false;
    }
  }, [_loadAex9DataFromMdw]);

  // Separate function to fetch Aeternity balances
  const fetchAeternityBalances = useCallback(async () => {
    const currentAssets = assetsRef.current;
    const currentSdk = sdkRef.current;
    const currentAeAccount = aeAccountRef.current;

    if (!currentAssets.length || !currentAeAccount || !currentAeAccount.startsWith('ak_') || !currentSdk) {
      setAeLoading(false);
      return;
    }

    // Prevent concurrent fetches
    if (isAeFetchingRef.current) {
      return;
    }

    isAeFetchingRef.current = true;
    setAeLoading(true);
    const newAeBalances: Record<string, string> = {};

    try {
      // Fetch all AEX-9 balances from middleware API (same approach as useAccountBalances)
      const url = `/v3/accounts/${currentAeAccount}/aex9/balances?limit=100`;
      const middlewareBalances = await _loadAex9DataFromMdw(url, []);

      // Create a map of contract addresses to balances for quick lookup
      const balanceMap = new Map();
      middlewareBalances.forEach((balance: any) => {
        balanceMap.set(balance.contract_id, {
          amount: balance.amount,
          decimals: balance.decimals,
        });
      });

      // Process each asset
      await Promise.all(
        currentAssets.map(async (asset) => {
          try {
            if (asset.aeAddress === BridgeConstants.aeternity.default_ae) {
              // Native AE - use getTokenBalance for consistency
              const balance = await getTokenBalance(currentSdk, 'AE', currentAeAccount as `ak_${string}`);
              const balanceFormatted = new BigNumber(balance.toString())
                .shiftedBy(-18)
                .toFixed(6, BigNumber.ROUND_DOWN);
              newAeBalances[asset.symbol] = balanceFormatted;
            } else {
              // AEX-9 token - check middleware first, fallback to contract call
              const middlewareBalance = balanceMap.get(asset.aeAddress);
              if (middlewareBalance) {
                // Use middleware data
                const balanceFormatted = new BigNumber(middlewareBalance.amount)
                  .shiftedBy(-middlewareBalance.decimals)
                  .toFixed(6, BigNumber.ROUND_DOWN);
                newAeBalances[asset.symbol] = balanceFormatted;
              } else {
                // Fallback to contract call for tokens not in middleware
                try {
                  const balance = await getTokenBalance(currentSdk, asset.aeAddress, currentAeAccount as `ak_${string}`);
                  const balanceFormatted = new BigNumber(balance.toString())
                    .shiftedBy(-asset.decimals)
                    .toFixed(6, BigNumber.ROUND_DOWN);
                  newAeBalances[asset.symbol] = balanceFormatted;
                } catch (contractError) {
                  newAeBalances[asset.symbol] = '0';
                }
              }
            }
          } catch (error) {
            newAeBalances[asset.symbol] = '0';
          }
        }),
      );
    } catch (error) {
      // Fallback to individual contract calls if middleware fails
      try {
        await Promise.all(
          currentAssets.map(async (asset) => {
            try {
              if (asset.aeAddress === BridgeConstants.aeternity.default_ae) {
                const balance = await getTokenBalance(currentSdk, 'AE', currentAeAccount as `ak_${string}`);
                const balanceFormatted = new BigNumber(balance.toString())
                  .shiftedBy(-18)
                  .toFixed(6, BigNumber.ROUND_DOWN);
                newAeBalances[asset.symbol] = balanceFormatted;
              } else {
                const balance = await getTokenBalance(currentSdk, asset.aeAddress, currentAeAccount as `ak_${string}`);
                const balanceFormatted = new BigNumber(balance.toString())
                  .shiftedBy(-asset.decimals)
                  .toFixed(6, BigNumber.ROUND_DOWN);
                newAeBalances[asset.symbol] = balanceFormatted;
              }
            } catch (fallbackError) {
              newAeBalances[asset.symbol] = '0';
            }
          }),
        );
      } catch (fallbackError) {
      }
    } finally {
      setAeBalances(newAeBalances);
      setAeLoading(false);
      isAeFetchingRef.current = false;
    }
  }, [_loadAex9DataFromMdw]);

  // Main function that calls both individual functions
  const fetchBalances = useCallback(async () => {
    const currentAssets = assetsRef.current;
    const currentAeAccount = aeAccountRef.current;
    const currentEthAccount = ethAccountRef.current;

    if (!currentAssets.length) {
      setLoading(false);
      return;
    }

    // Only fetch if we have accounts to fetch for
    if (!currentAeAccount && !currentEthAccount) {
      setLoading(false);
      return;
    }

    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    setLoading(true);

    try {
      // Fetch both Ethereum and Aeternity balances in parallel
      await Promise.all([fetchEthereumBalances(), fetchAeternityBalances()]);
    } catch (error) {
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [fetchEthereumBalances, fetchAeternityBalances]);

  // Auto-fetch when Ethereum address changes
  useEffect(() => {
    if (ethAccount) {
      fetchEthereumBalances();
    }
  }, [ethAccount]);

  // Auto-fetch when Aeternity address changes
  useEffect(() => {
    if (aeAccount) {
      fetchAeternityBalances();
    }
  }, [aeAccount]);

  return {
    aeBalances,
    ethBalances,
    loading,
    ethLoading,
    aeLoading,
    refetch: fetchBalances,
    refetchEth: fetchEthereumBalances,
    refetchAe: fetchAeternityBalances,
  };
}
