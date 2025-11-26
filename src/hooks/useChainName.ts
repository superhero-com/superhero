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

// Cache verification results per name to avoid re-verifying the same name too often
interface NameVerificationCache {
    name: string;
    pointsTo: string; // Account address this name points to
    verifiedAt: number; // Timestamp when verified
}
const nameVerificationCache = new Map<string, NameVerificationCache>();
const VERIFICATION_CACHE_TTL = 1000 * 60 * 15; // 15 minutes - cache verification results

// Cache refresh interval for addresses with names (longer than no-name check)
const CACHED_NAME_REFRESH_INTERVAL = 1000 * 60 * 10; // 10 minutes - refresh cached names less frequently

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
            
            // Group names by name string and get the latest entry for each name
            // The API returns historical records, so we need to use only the most recent pointer update
            const latestByName = new Map<string, ChainNameResponse>();
            
            for (const name of names) {
                if (!name.active || !name.tx?.pointers || !Array.isArray(name.tx.pointers)) {
                    continue;
                }
                
                const existing = latestByName.get(name.name);
                const nameBlockHeight = name.block_height ?? 0;
                
                // Keep only the latest entry for each name (highest block_height)
                if (!existing || nameBlockHeight > (existing.block_height ?? 0)) {
                    latestByName.set(name.name, name);
                }
            }
            
            // Verify current pointer state for each name by querying the name directly
            // The /names/pointees endpoint returns historical records, so we need to check current state
            // Use cached verification results to avoid excessive API calls
            const verifiedNames: Array<{ name: string; blockHeight: number; time: number }> = [];
            const now = Date.now();
            
            // Check each name's current state (using cache when available)
            const verificationPromises = Array.from(latestByName.values()).map(async (name) => {
                // Check cache first
                const cached = nameVerificationCache.get(name.name);
                if (cached && (now - cached.verifiedAt) < VERIFICATION_CACHE_TTL) {
                    // Use cached verification result
                    if (cached.pointsTo === accountAddress) {
                        return { name: name.name, blockHeight: name.block_height ?? 0, time: name.block_time ?? 0 };
                    }
                    return null;
                }
                
                // Cache expired or missing - verify by querying the name directly
                try {
                    const nameUrl = `${base}/v3/names/${encodeURIComponent(name.name)}`;
                    const nameResponse = await fetch(nameUrl, { cache: 'no-cache' });
                    
                    if (!nameResponse.ok) {
                        // If name query fails, fall back to using the pointees data
                        const hasMatchingPointer = name.tx.pointers.some(
                            pointer => pointer && pointer.id === accountAddress
                        );
                        // Cache the fallback result (but mark as less reliable)
                        if (hasMatchingPointer) {
                            nameVerificationCache.set(name.name, {
                                name: name.name,
                                pointsTo: accountAddress,
                                verifiedAt: now - VERIFICATION_CACHE_TTL + (1000 * 60 * 5), // Shorter cache for fallback
                            });
                            return { name: name.name, blockHeight: name.block_height ?? 0, time: name.block_time ?? 0 };
                        }
                        return null;
                    }
                    
                    const nameData = await nameResponse.json();
                    
                    // Check if the CURRENT pointer points to this account address
                    const currentPointers = nameData.pointers || [];
                    const currentPointerAddress = currentPointers[0]?.id || null;
                    const hasMatchingPointer = currentPointers.some(
                        (pointer: any) => pointer && pointer.id === accountAddress
                    );
                    
                    // Cache the verification result
                    nameVerificationCache.set(name.name, {
                        name: name.name,
                        pointsTo: currentPointerAddress || '',
                        verifiedAt: now,
                    });
                    
                    if (hasMatchingPointer) {
                        return { 
                            name: name.name, 
                            blockHeight: name.block_height ?? 0, 
                            time: name.block_time ?? 0 
                        };
                    }
                    
                    return null;
                } catch (e) {
                    // If verification fails, fall back to pointees data
                    const hasMatchingPointer = name.tx.pointers.some(
                        pointer => pointer && pointer.id === accountAddress
                    );
                    return hasMatchingPointer ? { name: name.name, blockHeight: name.block_height ?? 0, time: name.block_time ?? 0 } : null;
                }
            });
            
            const verifiedResults = await Promise.all(verificationPromises);
            for (const result of verifiedResults) {
                if (result) {
                    verifiedNames.push(result);
                }
            }
            
            const matchingNames = verifiedNames;
            
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
                    
                    requestQueue.add(accountAddress);
                    fetchingRef.current.add(accountAddress);
                    
                    fetchChainNameFromMiddleware(accountAddress)
                        .then(name => {
                            if (name && name !== cachedName) {
                                // Found a different (newer) name - update cache
                                setChainNames(prev => ({ ...prev, [accountAddress]: name }));
                                noNameCheckTimestamps.delete(accountAddress);
                            }
                            // Update refresh timestamp regardless of whether name changed
                            noNameCheckTimestamps.set(lastRefreshKey, Date.now());
                        })
                        .finally(() => {
                            fetchingRef.current.delete(accountAddress);
                            requestQueue.delete(accountAddress);
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