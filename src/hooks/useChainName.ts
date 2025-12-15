import { useAtom } from "jotai";
import { useEffect, useMemo, useRef } from "react";
import { chainNamesAtom } from "../atoms/walletAtoms";
import { AccountsService } from "../api/generated/services/AccountsService";
import { useAeSdk } from "./useAeSdk";

// Global request queue to prevent duplicate requests
const pendingRequests = new Map<string, Promise<string | null>>();

// Track addresses that have been checked and found no name (with timestamps)
const noNameCheckTimestamps = new Map<string, number>();
const NO_NAME_REFRESH_INTERVAL = 1000 * 60 * 10; // 10 minutes - refresh interval

// Cache refresh interval for addresses with names
const CACHED_NAME_REFRESH_INTERVAL = 1000 * 60 * 15; // 15 minutes - chain names don't change often

async function fetchChainNameFromBackend(accountAddress: string): Promise<string | null> {
    // If there's already a pending request for this address, return it
    const pending = pendingRequests.get(accountAddress);
    if (pending) {
        return pending;
    }

    const requestPromise = (async () => {
        try {
            // Use backend API which handles all the complex logic
            const account = await AccountsService.getAccount({ address: accountAddress });
            return account?.chain_name || null;
        } catch (e: any) {
            // 404 is normal if account doesn't exist
            if (e?.status === 404) {
                return null;
            }
            console.warn('Failed to fetch chain name from backend', e);
            return null;
        } finally {
            pendingRequests.delete(accountAddress);
        }
    })();

    pendingRequests.set(accountAddress, requestPromise);
    return requestPromise;
}

export function useChainName(accountAddress: string) {
    const [chainNames, setChainNames] = useAtom(chainNamesAtom);
    const fetchingRef = useRef<Set<string>>(new Set());
    const chainNamesRef = useRef(chainNames);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const chainName = useMemo(() => chainNames[accountAddress], [chainNames, accountAddress]);

    // Keep ref updated with latest chainNames
    useEffect(() => {
        chainNamesRef.current = chainNames;
    }, [chainNames]);

    useEffect(() => {
        if (!accountAddress) return;
        
        // Clear any pending timeouts/intervals
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        if (intervalRef.current) {
            clearTimeout(intervalRef.current);
            intervalRef.current = null;
        }
        
        const cachedName = chainNamesRef.current[accountAddress];
        const lastNoNameCheck = noNameCheckTimestamps.get(accountAddress);
        const now = Date.now();
        
        // If name exists in cache, refresh it periodically but not too frequently
        // Chain names don't change often, so we can use a longer refresh interval
        if (cachedName) {
            // Track when this cached name was last refreshed
            const lastRefreshKey = `chainName:refresh:${accountAddress}`;
            const lastRefresh = noNameCheckTimestamps.get(lastRefreshKey) || 0;
            const timeSinceRefresh = now - lastRefresh;
            
            // Only refresh if it's been a while since last refresh
            if (timeSinceRefresh >= CACHED_NAME_REFRESH_INTERVAL) {
                const performFetchForCached = () => {
                    // Double-check cache hasn't changed
                    if (chainNamesRef.current[accountAddress] !== cachedName) {
                        return; // Another component already updated it
                    }
                    
                    fetchingRef.current.add(accountAddress);
                    
                    fetchChainNameFromBackend(accountAddress)
                        .then(name => {
                            if (name && name !== cachedName) {
                                // Found a different (newer) name - update cache
                                setChainNames(prev => ({ ...prev, [accountAddress]: name }));
                                noNameCheckTimestamps.delete(accountAddress);
                            } else if (!name && cachedName) {
                                // Chain name was removed/expired - clear cache
                                setChainNames(prev => {
                                    const updated = { ...prev };
                                    delete updated[accountAddress];
                                    return updated;
                                });
                                noNameCheckTimestamps.set(accountAddress, Date.now());
                            }
                            // Update refresh timestamp regardless of whether name changed
                            noNameCheckTimestamps.set(lastRefreshKey, Date.now());
                        })
                        .finally(() => {
                            fetchingRef.current.delete(accountAddress);
                        });
                };
                
                // Schedule refresh (no immediate debounce needed since we already checked time)
                timeoutRef.current = setTimeout(() => {
                    performFetchForCached();
                }, 1000); // Small delay to batch requests
            }
            
            return;
        }
        
        // Address has no name - check if we should fetch
        const shouldFetch = () => {
            // Prevent duplicate requests
            if (fetchingRef.current.has(accountAddress) || pendingRequests.has(accountAddress)) {
                return false;
            }
            
            // If we've never checked, or it's been a while since last check, fetch
            if (!lastNoNameCheck || (now - lastNoNameCheck) >= NO_NAME_REFRESH_INTERVAL) {
                return true;
            }
            
            return false;
        };
        
        const performFetch = () => {
            // Double-check cache before fetching (might have been loaded by another component)
            if (chainNamesRef.current[accountAddress]) {
                return;
            }
            
            fetchingRef.current.add(accountAddress);
            
            // Capture current timestamp when fetch actually executes (not when scheduled)
            const fetchTime = Date.now();
            
            fetchChainNameFromBackend(accountAddress)
                .then(name => {
                    if (name) {
                        // Found a name - update cache and remove from no-name tracking
                        setChainNames(prev => ({ ...prev, [accountAddress]: name }));
                        noNameCheckTimestamps.delete(accountAddress);
                    } else {
                        // No name found - remember we checked this address (use current fetch time)
                        noNameCheckTimestamps.set(accountAddress, fetchTime);
                    }
                })
                .finally(() => {
                    fetchingRef.current.delete(accountAddress);
                });
        };
        
        if (shouldFetch()) {
            // Debounce: Wait 5 seconds before fetching to batch requests and reduce spam
            // This prevents fetching for every address immediately when feed loads
            // Only addresses that stay visible will trigger a fetch
            timeoutRef.current = setTimeout(() => {
                performFetch();
            }, 5000); // 5 second delay - only fetch for addresses that stay visible
        } else if (lastNoNameCheck) {
            // Set up interval to check again after the refresh interval
            const timeUntilNextCheck = NO_NAME_REFRESH_INTERVAL - (now - lastNoNameCheck);
            if (timeUntilNextCheck > 0) {
                intervalRef.current = setTimeout(() => {
                    performFetch();
                }, timeUntilNextCheck);
            } else {
                // Already past refresh interval, fetch now (with debounce)
                timeoutRef.current = setTimeout(() => {
                    performFetch();
                }, 5000);
            }
        }

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
            if (intervalRef.current) {
                clearTimeout(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [accountAddress, setChainNames]);

    return { chainName };
}

export function useSuperheroChainNames() {
    const [chainNames, setChainNames] = useAtom(chainNamesAtom);
    const { activeAccount } = useAeSdk();
    const fetchingRef = useRef(false);
    const chainNamesRef = useRef(chainNames);

    // Keep ref updated with latest chainNames
    useEffect(() => {
        chainNamesRef.current = chainNames;
    }, [chainNames]);

    useEffect(() => {
        if (!activeAccount) return;
        
        async function loadChainNameForAccount(accountAddress: string) {
            if (!accountAddress || fetchingRef.current) return;
            
            const cachedName = chainNamesRef.current[accountAddress];
            const lastNoNameCheck = noNameCheckTimestamps.get(accountAddress);
            const now = Date.now();
            
            // If name exists in cache, use it - don't fetch frequently
            if (cachedName) {
                return;
            }
            
            // If we've checked recently and found no name, respect the refresh interval
            if (lastNoNameCheck && (now - lastNoNameCheck) < NO_NAME_REFRESH_INTERVAL) {
                return;
            }
            
            fetchingRef.current = true;
            try {
                const name = await fetchChainNameFromBackend(accountAddress);
                if (name) {
                    // Found a name - update cache and remove from no-name tracking
                    setChainNames(prev => ({ ...prev, [accountAddress]: name }));
                    noNameCheckTimestamps.delete(accountAddress);
                } else {
                    // No name found - remember we checked this address
                    noNameCheckTimestamps.set(accountAddress, now);
                }
            } catch (e) {
                // ignore transient errors; keep existing cache
                console.warn('Failed to load chain name', e);
            } finally {
                fetchingRef.current = false;
            }
        }
        
        // Load chain name for active account immediately (no debounce for active account)
        loadChainNameForAccount(activeAccount);
        
        // Refresh periodically for addresses without names
        // Addresses with names won't trigger refresh due to early return in loadChainNameForAccount
        const interval = setInterval(() => {
            if (activeAccount && !fetchingRef.current) {
                loadChainNameForAccount(activeAccount);
            }
        }, NO_NAME_REFRESH_INTERVAL); // Check every 5 minutes for addresses without names

        return () => clearInterval(interval);
    }, [activeAccount, setChainNames]);

    return { chainNames };
}

export function useAddressByChainName(chainNameInput?: string) {
    const [chainNames] = useAtom(chainNamesAtom);
    const address = useMemo(() => {
        if (!chainNameInput) return null;
        const target = chainNameInput.toLowerCase();
        for (const [addr, name] of Object.entries(chainNames)) {
            if ((name || '').toLowerCase() === target) return addr;
        }
        return null;
    }, [chainNames, chainNameInput]);
    return { address };
}