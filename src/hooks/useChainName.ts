import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { selectAtom } from 'jotai/utils';
import {
  useCallback, useEffect, useMemo, useState,
} from 'react';
import { AccountsService } from '../api/generated/services/AccountsService';
import {
  chainNameLookupCheckedAtAtom,
  chainNamesAtom,
} from '../atoms/walletAtoms';
import { CURRENT_NETWORK } from '../utils/constants';

const CHAIN_NAME_REFRESH_INTERVAL = 1000 * 60 * 60; // 1 hour
const CHAIN_NAME_RETRY_INTERVAL = 1000 * 60 * 5; // 5 minutes
const BATCH_DEBOUNCE_MS = 80;
// Matches the backend's per-request cap (GET /api/accounts/chain-names).
const CHAIN_NAMES_BATCH_SIZE = 25;
const MIDDLEWARE_NAMES_PATH = '/v3/names';

const AK_ADDRESS_RE = /^ak_[1-9A-HJ-NP-Za-km-z]{48,56}$/;

type MiddlewareName = {
  name?: string | null;
  pointers?: Array<{
    id?: string | null;
    key?: string | null;
  }> | null;
};

function normalizeChainName(name: unknown): string {
  const value = String(name || '').trim();
  return value.toLowerCase().endsWith('.chain') ? value : '';
}

function isValidAkAddress(address: string): boolean {
  return AK_ADDRESS_RE.test(address);
}

function getPointedAccount(name: MiddlewareName): string {
  const pointer = (name.pointers || []).find((item) => item?.key === 'account_pubkey');
  const address = String(pointer?.id || '').trim();
  return isValidAkAddress(address) ? address : '';
}

function normalizeAccountAddress(accountAddress?: string | null): string {
  return String(accountAddress || '').trim();
}

// ---------------------------------------------------------------------------
// Batched fetch queue — collects addresses over BATCH_DEBOUNCE_MS, then
// resolves them all via the backend's batch endpoint (chunked to its
// <=25-address cap). Deduplicates in-flight requests and prevents duplicate
// scheduling.
// ---------------------------------------------------------------------------

type BatchCallback = (results: Map<string, string>) => void;

let batchQueue: string[] = [];
let batchTimer: ReturnType<typeof setTimeout> | null = null;
let batchCallbacks: BatchCallback[] = [];
const inflightAddresses = new Set<string>();

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

// Resolves chain names for many addresses via the backend's batch endpoint
// (one request per <=25 addresses) instead of one middleware request per
// address — this is called for every author in a feed page, so batching it
// is the difference between 1 request and N requests per page.
async function fetchChainNamesBatch(addresses: string[]): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  await Promise.all(chunk(addresses, CHAIN_NAMES_BATCH_SIZE).map(async (batch) => {
    try {
      const resp = await AccountsService.getChainNamesForAddresses({
        addresses: batch.join(','),
      }) as Record<string, string | null>;
      batch.forEach((addr) => {
        results.set(addr, normalizeChainName(resp?.[addr]));
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.debug('[useChainName] batch lookup failed for', batch, err);
    }
  }));
  return results;
}

async function fetchAddressByChainName(
  chainNameInput: string,
  signal?: AbortSignal,
): Promise<string> {
  const chainName = normalizeChainName(chainNameInput);
  if (!chainName) return '';

  const middlewareUrl = CURRENT_NETWORK.middlewareUrl.replace(/\/$/, '');
  const res = await fetch(
    `${middlewareUrl}${MIDDLEWARE_NAMES_PATH}/${encodeURIComponent(chainName)}`,
    signal ? { signal } : undefined,
  );
  if (res.status === 404) return '';
  if (!res.ok) throw new Error(`Middleware name request failed with ${res.status}`);

  const payload = await res.json() as MiddlewareName & { active?: boolean | null };
  if (!payload?.active || normalizeChainName(payload.name).toLowerCase() !== chainName.toLowerCase()) return '';
  return getPointedAccount(payload);
}

function flushBatch() {
  batchTimer = null;
  const addresses = [...new Set(batchQueue)];
  const callbacks = [...batchCallbacks];
  batchQueue = [];
  batchCallbacks = [];

  if (!addresses.length) return;

  addresses.forEach((addr) => inflightAddresses.add(addr));

  fetchChainNamesBatch(addresses).then((results) => {
    addresses.forEach((a) => inflightAddresses.delete(a));
    callbacks.forEach((cb) => cb(results));
  });
}

function scheduleLookup(address: string, callback: BatchCallback) {
  if (inflightAddresses.has(address)) return;
  if (batchQueue.includes(address)) return;

  batchQueue.push(address);
  if (!batchCallbacks.includes(callback)) batchCallbacks.push(callback);

  if (batchTimer === null) {
    batchTimer = setTimeout(flushBatch, BATCH_DEBOUNCE_MS);
  }
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useEnsureChainName(accountAddress?: string | null) {
  const normalizedAddress = normalizeAccountAddress(accountAddress);

  const checkedAtSelector = useMemo(
    () => selectAtom(
      chainNameLookupCheckedAtAtom,
      (all) => all[normalizedAddress] || 0,
    ),
    [normalizedAddress],
  );
  const lastCheckedAt = useAtomValue(checkedAtSelector);

  const setChainNames = useSetAtom(chainNamesAtom);
  const setCheckedAt = useSetAtom(chainNameLookupCheckedAtAtom);

  const handleResult = useCallback((addr: string, results: Map<string, string>) => {
    if (!addr || !results.has(addr)) return;
    const name = results.get(addr)!;

    setCheckedAt((prev) => ({ ...prev, [addr]: Date.now() }));
    setChainNames((prev) => {
      if (name) {
        if (prev[addr] === name) return prev;
        return { ...prev, [addr]: name };
      }
      if (!prev[addr]) return prev;
      const next = { ...prev };
      delete next[addr];
      return next;
    });
  }, [setCheckedAt, setChainNames]);

  const handleError = useCallback((addr: string) => {
    const retryAt = Date.now() - CHAIN_NAME_REFRESH_INTERVAL + CHAIN_NAME_RETRY_INTERVAL;
    setCheckedAt((prev) => ({ ...prev, [addr]: retryAt }));
  }, [setCheckedAt]);

  useEffect(() => {
    if (!normalizedAddress || !isValidAkAddress(normalizedAddress)) return;
    if (Date.now() - lastCheckedAt <= CHAIN_NAME_REFRESH_INTERVAL) return;

    scheduleLookup(normalizedAddress, (results) => {
      const addr = normalizedAddress;
      if (!results.has(addr)) {
        handleError(addr);
        return;
      }
      handleResult(addr, results);
    });
  }, [normalizedAddress, lastCheckedAt, handleResult, handleError]);
}

export function useChainName(accountAddress: string, options?: { lookup?: boolean }) {
  const normalizedAddress = normalizeAccountAddress(accountAddress);
  const chainNames = useAtomValue(chainNamesAtom);
  const chainName = useMemo(
    () => chainNames[normalizedAddress],
    [chainNames, normalizedAddress],
  );
  useEnsureChainName(options?.lookup === false ? undefined : normalizedAddress);

  return { chainName };
}

type PostWithSender = {
  sender_address?: string | null;
  sender?: {
    address?: string | null;
    public_name?: string | null;
  } | null;
};

export function useStorePostSenderChainNames(posts: Array<PostWithSender | null | undefined>) {
  const setChainNames = useSetAtom(chainNamesAtom);
  const setCheckedAt = useSetAtom(chainNameLookupCheckedAtAtom);

  useEffect(() => {
    const names = posts.reduce<Record<string, string>>((acc, post) => {
      const address = String(post?.sender?.address || post?.sender_address || '').trim();
      const name = normalizeChainName(post?.sender?.public_name);
      if (address && name) acc[address] = name;
      return acc;
    }, {});
    const entries = Object.entries(names);
    if (!entries.length) return;

    const now = Date.now();
    setChainNames((prev) => {
      let changed = false;
      const next = { ...prev };
      entries.forEach(([address, name]) => {
        if (next[address] !== name) {
          next[address] = name;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
    setCheckedAt((prev) => {
      let changed = false;
      const next = { ...prev };
      entries.forEach(([address]) => {
        if (!prev[address] || now - prev[address] > CHAIN_NAME_REFRESH_INTERVAL) {
          next[address] = now;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [posts, setCheckedAt, setChainNames]);
}

export function useAddressByChainName(chainNameInput?: string) {
  const [chainNames, setChainNames] = useAtom(chainNamesAtom);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const chainName = normalizeChainName(chainNameInput);
  const chainNameKey = chainName.toLowerCase();

  const cachedAddress = useMemo(() => {
    if (!chainNameKey) return null;
    const match = Object.entries(chainNames).find(
      ([, name]) => ((name as string) || '').toLowerCase() === chainNameKey,
    );
    return match ? match[0] : null;
  }, [chainNames, chainNameKey]);

  useEffect(() => {
    if (!chainName || cachedAddress) {
      setResolvedAddress(null);
      setIsLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    setResolvedAddress(null);
    setIsLoading(true);
    fetchAddressByChainName(chainName, controller.signal)
      .then((address) => {
        if (!address) {
          setResolvedAddress(null);
          return;
        }
        setResolvedAddress(address);
        setChainNames((prev) => (
          prev[address] === chainNameKey ? prev : { ...prev, [address]: chainNameKey }
        ));
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') {
          setResolvedAddress(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [cachedAddress, chainName, chainNameKey, setChainNames]);

  return { address: cachedAddress || resolvedAddress, isLoading };
}
