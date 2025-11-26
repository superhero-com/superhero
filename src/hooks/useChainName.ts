import { useAtom } from "jotai";
import { useEffect, useMemo, useRef } from "react";
import { chainNamesAtom } from "../atoms/walletAtoms";
import { CONFIG } from "../config";
import { useAeSdk } from "./useAeSdk";

interface ChainNameResponse {
    active: boolean;
    name: string;
    key: string;
    block_height?: number;
    block_time?: number;
    tx: {
        pointers: Array<{
            encoded_key: string;
            id: string;
            key: string;
        }>;
    };
}

// Global request queue and rate limiter to prevent too many simultaneous requests
const requestQueue = new Set<string>();
const pendingRequests = new Map<string, Promise<string | null>>();
const MAX_CONCURRENT_REQUESTS = 3;
let activeRequestCount = 0;

// Track addresses that have been checked and found no name (with timestamps)
// This allows us to check addresses without names more frequently
const noNameCheckTimestamps = new Map<string, number>();
const NO_NAME_REFRESH_INTERVAL = 1000 * 60 * 5; // 5 minutes - check addresses without names more often

async function fetchChainNameFromMiddleware(accountAddress: string): Promise<string | null> {
    // If there's already a pending request for this address, return it
    const pending = pendingRequests.get(accountAddress);
    if (pending) {
        return pending;
    }

    // Wait if we're at the concurrent request limit
    const waitForSlot = (): Promise<void> => {
        return new Promise((resolve) => {
            const checkSlot = () => {
                if (activeRequestCount < MAX_CONCURRENT_REQUESTS) {
                    activeRequestCount++;
                    resolve();
                } else {
                    setTimeout(checkSlot, 100); // Check every 100ms
                }
            };
            checkSlot();
        });
    };

    const requestPromise = (async () => {
        try {
            await waitForSlot();
            
            const base = (CONFIG.MIDDLEWARE_URL || '').replace(/\/$/, '');
            if (!base) {
                console.warn('MIDDLEWARE_URL not configured');
                return null;
            }
            
            const url = `${base}/v3/accounts/${encodeURIComponent(accountAddress)}/names/pointees`;
            const response = await fetch(url, { cache: 'no-cache' });
            
            if (!response.ok) {
                if (response.status === 404) {
                    // Account not found or no names - this is normal
                    return null;
                }
                throw new Error(`Failed to fetch chain names: ${response.status} ${response.statusText}`);
            }
            
            const names: ChainNameResponse[] = (await response.json()).data as ChainNameResponse[];
            
            if (!Array.isArray(names)) {
                return null;
            }
            
            // Find all active names that have the account address in their pointers
            const matchingNames: Array<{ name: string; blockHeight: number; time: number }> = [];
            
            for (const name of names) {
                if (name.active && name.tx?.pointers) {
                    const hasMatchingPointer = name.tx.pointers.some(
                        pointer => pointer.id === accountAddress
                    );
                    if (hasMatchingPointer) {
                        // Use block_height if available, otherwise fall back to block_time, otherwise 0
                        const blockHeight = name.block_height ?? 0;
                        const time = name.block_time ?? 0;
                        matchingNames.push({ name: name.name, blockHeight, time });
                    }
                }
            }
            
            if (matchingNames.length === 0) {
                return null;
            }
            
            // Sort by block_height (descending), then by time (descending) as fallback
            // The newest pointer will have the highest block_height
            matchingNames.sort((a, b) => {
                if (a.blockHeight !== b.blockHeight) {
                    return b.blockHeight - a.blockHeight; // Higher block_height = newer
                }
                return b.time - a.time; // Higher time = newer
            });
            
            // Return the name with the newest pointer
            return matchingNames[0].name;
        } catch (e) {
            console.warn('Failed to fetch chain name from middleware', e);
            return null;
        } finally {
            activeRequestCount--;
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
        
        // If name exists in cache, we should still verify it's the newest one
        // This is important when users have multiple chain names - we want the newest pointer
        // So we'll fetch to check, but with a longer debounce to avoid excessive requests
        if (cachedName) {
            // Still fetch to ensure we have the newest pointer, but with a longer delay
            // This handles cases where a user has multiple names and we cached an older one
            const performFetchForCached = () => {
                // Double-check cache hasn't changed
                if (chainNamesRef.current[accountAddress] !== cachedName) {
                    return; // Another component already updated it
                }
                
                requestQueue.add(accountAddress);
                fetchingRef.current.add(accountAddress);
                
                fetchChainNameFromMiddleware(accountAddress)
                    .then(name => {
                        if (name && name !== cachedName) {
                            // Found a different (newer) name - update cache
                            setChainNames(prev => ({ ...prev, [accountAddress]: name }));
                            noNameCheckTimestamps.delete(accountAddress);
                        }
                    })
                    .finally(() => {
                        fetchingRef.current.delete(accountAddress);
                        requestQueue.delete(accountAddress);
                    });
            };
            
            // Debounce: Wait 2 seconds before checking cached names (less aggressive than new fetches)
            timeoutRef.current = setTimeout(() => {
                performFetchForCached();
            }, 2000);
            
            return;
        }
        
        // Address has no name - check if we should fetch
        const shouldFetch = () => {
            // Prevent duplicate requests
            if (fetchingRef.current.has(accountAddress) || requestQueue.has(accountAddress)) {
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
            
            // Add to queue and fetch
            requestQueue.add(accountAddress);
            fetchingRef.current.add(accountAddress);
            
            fetchChainNameFromMiddleware(accountAddress)
                .then(name => {
                    if (name) {
                        // Found a name - update cache and remove from no-name tracking
                        setChainNames(prev => ({ ...prev, [accountAddress]: name }));
                        noNameCheckTimestamps.delete(accountAddress);
                    } else {
                        // No name found - remember we checked this address
                        noNameCheckTimestamps.set(accountAddress, now);
                    }
                })
                .finally(() => {
                    fetchingRef.current.delete(accountAddress);
                    requestQueue.delete(accountAddress);
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
                const name = await fetchChainNameFromMiddleware(accountAddress);
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