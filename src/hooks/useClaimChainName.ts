import {
  useCallback,
  useEffect,
  useRef,
} from 'react';
import {
  type ChainNameClaimStatusResponse,
  SuperheroApi,
} from '@/api/backend';
import { decode } from '@aeternity/aepp-sdk';
import { CONFIG } from '@/config';
import { useAeSdk } from './useAeSdk';
import { useWalletConnect } from './useWalletConnect';

const normalizeName = (value: string) => value.trim().toLowerCase();
const normalizeAddress = (value?: string | null) => (value || '').trim().toLowerCase();
const readSdkString = (sdkRecord: Record<string, unknown>, key: string) => {
  try {
    const value = sdkRecord[key];
    return typeof value === 'string' ? value : '';
  } catch {
    return '';
  }
};
const getSdkAddresses = (candidate: any): string[] => {
  // eslint-disable-next-line no-underscore-dangle, dot-notation
  const current = candidate?.['_accounts']?.current;
  if (current && typeof current === 'object') return Object.keys(current);
  if (typeof candidate?.addresses === 'function') return candidate.addresses();
  return [];
};
const sdkHasAccount = (candidate: any, expectedAddress?: string): boolean => {
  const addresses = getSdkAddresses(candidate);
  if (!addresses.length) return false;
  if (!expectedAddress) return true;
  const target = normalizeAddress(expectedAddress);
  return addresses.some((address) => normalizeAddress(address) === target);
};
const isNameNotFoundError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || '');
  return /404|not found|name not found|Name revoked/i.test(message);
};
const isUserRejectedSigningError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || '');
  const lower = message.toLowerCase();
  const code = (error as any)?.code;
  return Boolean(
    code === 'ACTION_REJECTED'
    || code === 4001
    || lower.includes('rejected by user')
    || lower.includes('user rejected')
    || lower.includes('user denied')
    || lower.includes('denied by user')
    || lower.includes('cancelled by user')
    || lower.includes('canceled by user')
    || lower.includes('operation cancelled')
    || lower.includes('operation canceled'),
  );
};
const getSdkAddress = (sdk: unknown) => {
  if (sdk && typeof sdk === 'object') {
    const sdkRecord = sdk as Record<string, unknown>;
    const directAddress = readSdkString(sdkRecord, 'address');
    const selectedAddress = readSdkString(sdkRecord, 'selectedAddress');
    if (typeof directAddress === 'string' && directAddress) return directAddress;

    if (typeof selectedAddress === 'string' && selectedAddress) return selectedAddress;

    // eslint-disable-next-line no-underscore-dangle, dot-notation
    const accounts = sdkRecord['_accounts'];
    const currentAccounts = accounts && typeof accounts === 'object'
      ? (accounts as Record<string, unknown>).current
      : null;
    if (currentAccounts && typeof currentAccounts === 'object') {
      const firstAddress = Object.keys(currentAccounts as Record<string, unknown>)[0];
      if (firstAddress) return firstAddress;
    }
  }
  return '';
};
const wait = (ms: number) => new Promise((resolve) => {
  window.setTimeout(resolve, ms);
});
const stripTrailingSlash = (value: string) => value.replace(/\/$/, '');

const bytesToHex = (value: Uint8Array): string => Array.from(value)
  .map((byte) => byte.toString(16).padStart(2, '0'))
  .join('');

const normalizeSignatureHex = (signature: unknown): string => {
  if (typeof signature === 'string') {
    if (signature.startsWith('sg_')) return bytesToHex(decode(signature));
    const clean = signature.startsWith('0x') ? signature.slice(2) : signature;
    if (/^[0-9a-f]+$/iu.test(clean) && clean.length % 2 === 0) return clean.toLowerCase();
  }
  if (signature instanceof Uint8Array) return bytesToHex(signature);
  if (signature instanceof ArrayBuffer) return bytesToHex(new Uint8Array(signature));
  if (ArrayBuffer.isView(signature)) {
    return bytesToHex(
      new Uint8Array(signature.buffer, signature.byteOffset, signature.byteLength),
    );
  }
  if (Array.isArray(signature)) return bytesToHex(Uint8Array.from(signature));
  if (signature && typeof signature === 'object') {
    const nested = (signature as Record<string, unknown>).signature
      ?? (signature as Record<string, unknown>).raw
      ?? (signature as Record<string, unknown>).value;
    if (nested != null) return normalizeSignatureHex(nested);
  }
  throw new Error('Wallet did not return a valid signature');
};

const extractChainNameExpiry = (status?: ChainNameClaimStatusResponse | null): number | null => {
  if (!status) return null;
  return [
    status.expires_at,
    status.approximate_expire_time,
    status.approximateExpireTime,
    status.expire_time,
    status.expireTime,
  ].reduce<number | null>((resolved, value) => {
    if (resolved) return resolved;
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) return Math.floor(numeric);
    if (typeof value === 'string') {
      const parsed = Date.parse(value);
      if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
    }
    return null;
  }, null);
};

const readJson = async (url: string) => {
  try {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
};

const getApiBases = () => Array.from(
  new Set(
    [
      CONFIG.NODE_URL,
      CONFIG.MIDDLEWARE_URL,
    ].filter(Boolean).map((value) => stripTrailingSlash(String(value))),
  ),
);

const fetchTransactionRecord = async (txHash: string) => {
  const bases = getApiBases();
  const encodedHash = encodeURIComponent(txHash);
  const tryRead = async (index: number): Promise<any> => {
    if (index >= bases.length) return null;
    const data = await readJson(`${bases[index]}/v3/transactions/${encodedHash}?int-as-string=false`);
    if (data) return data;
    return tryRead(index + 1);
  };
  return tryRead(0);
};

const isTransactionMined = async (txHash?: string | null) => {
  if (!txHash) return false;
  const record = await fetchTransactionRecord(txHash);
  const blockHeight = Number(record?.block_height ?? record?.blockHeight ?? -1);
  return Number.isFinite(blockHeight) && blockHeight > 0;
};

const fetchNameRecord = async (name: string) => {
  const bases = getApiBases();
  const encodedName = encodeURIComponent(name);
  const tryRead = async (index: number): Promise<any> => {
    if (index >= bases.length) return null;
    const data = await readJson(`${bases[index]}/v3/names/${encodedName}`);
    if (data) return data;
    return tryRead(index + 1);
  };
  return tryRead(0);
};

const getAuthorizedWalletSigner = (
  walletSdk: unknown,
  targetAddress: string,
) => {
  if (!walletSdk || typeof walletSdk !== 'object') return null;
  const walletRecord = walletSdk as Record<string, unknown>;
  // eslint-disable-next-line no-underscore-dangle, dot-notation
  const resolver = walletRecord['_resolveAccount'];
  if (typeof resolver === 'function') {
    try {
      return resolver.call(walletSdk, targetAddress) as {
        signMessage?: (message: string) => Promise<unknown>;
      };
    } catch {
      return null;
    }
  }
  return null;
};

const signMessageWithSdk = async (
  signerSdk: unknown,
  address: string,
  message: string,
) => {
  if (!signerSdk || typeof signerSdk !== 'object') {
    throw new Error('Wallet message signing is not available');
  }
  if (typeof (signerSdk as any).selectAccount === 'function') {
    try {
      (signerSdk as any).selectAccount(address);
    } catch {
      // Continue; some sdk variants may not support explicit selection.
    }
  }
  if (typeof (signerSdk as any).signMessage === 'function') {
    try {
      return await (signerSdk as any).signMessage(message, { onAccount: address });
    } catch (error) {
      if (isUserRejectedSigningError(error)) throw error;
      // Fall through to account-level signer resolution below.
    }
  }
  const walletSigner = getAuthorizedWalletSigner(signerSdk, address);
  if (walletSigner && typeof walletSigner.signMessage === 'function') {
    return walletSigner.signMessage(message);
  }
  throw new Error('Wallet message signing is not available');
};

const extractAccountPointer = (pointers: unknown) => {
  if (Array.isArray(pointers)) {
    const accountPointer = pointers.find((pointer) => (
      normalizeName(String((pointer as Record<string, unknown>)?.key || '')) === 'account_pubkey'
    ));
    return normalizeAddress(
      (accountPointer as Record<string, unknown> | undefined)?.id as string | undefined,
    );
  }
  if (pointers && typeof pointers === 'object') {
    return normalizeAddress(
      (pointers as Record<string, unknown>).account_pubkey as string | undefined
        ?? (pointers as Record<string, unknown>).accountPubkey as string | undefined,
    );
  }
  return '';
};

const isNameClaimFinalized = async (name: string, address: string) => {
  const record = await fetchNameRecord(name);
  const ownerAddress = normalizeAddress(
    record?.ownership?.current ?? record?.owner_id ?? record?.owner ?? record?.ownerId,
  );
  const targetAddress = normalizeAddress(address);
  if (ownerAddress !== targetAddress) return false;

  const accountPointer = extractAccountPointer(record?.pointers);
  return !accountPointer || accountPointer === targetAddress;
};

const buildVerifiedStatus = (
  name: string,
  baseStatus: ChainNameClaimStatusResponse,
  overrides: Partial<ChainNameClaimStatusResponse> = {},
): ChainNameClaimStatusResponse => ({
  ...baseStatus,
  name,
  ...overrides,
});
export function useClaimChainName(targetAddress?: string) {
  const {
    activeAccount,
    aeSdk,
    sdk,
    staticAeSdk,
  } = useAeSdk();
  const {
    connectWallet,
    connectingWallet,
    walletConnected,
    walletInfo,
  } = useWalletConnect();
  const activeAccountRef = useRef<string | undefined>(activeAccount);
  const walletConnectedRef = useRef(walletConnected);
  const walletInfoRef = useRef(walletInfo);
  const connectingWalletRef = useRef(connectingWallet);

  useEffect(() => {
    activeAccountRef.current = activeAccount;
  }, [activeAccount]);

  useEffect(() => {
    walletConnectedRef.current = walletConnected;
  }, [walletConnected]);

  useEffect(() => {
    walletInfoRef.current = walletInfo;
  }, [walletInfo]);

  useEffect(() => {
    connectingWalletRef.current = connectingWallet;
  }, [connectingWallet]);

  const connectedAddress = activeAccount || getSdkAddress(aeSdk) || getSdkAddress(sdk);

  const waitForWalletReconnect = useCallback(async (
    expectedAddress?: string,
    timeoutMs = 20_000,
  ): Promise<string> => {
    const knownAddress = expectedAddress || targetAddress;
    const normalizedKnownAddress = knownAddress ? normalizeAddress(knownAddress) : '';
    const matchesExpectedAddress = (account?: string) => {
      if (!account) return false;
      if (!knownAddress) return true;
      return normalizeAddress(account) === normalizedKnownAddress;
    };
    const hasKnownSignerReady = () => (
      Boolean(knownAddress)
      && walletConnectedRef.current
      && sdkHasAccount(aeSdk, knownAddress)
    );
    const getReconnectAddress = (): string | null => {
      const { current } = activeAccountRef;
      if (knownAddress) {
        if (hasKnownSignerReady()) return knownAddress as string;
        if (walletConnectedRef.current && matchesExpectedAddress(current)) return current as string;
      } else if (walletConnectedRef.current && matchesExpectedAddress(current)) {
        return current as string;
      }
      return null;
    };

    const immediate = getReconnectAddress();
    if (immediate) return immediate;

    if (!walletConnectedRef.current && !walletInfoRef.current) {
      throw new Error('You are not connected to Wallet');
    }

    if (!walletConnectedRef.current && walletInfoRef.current && !connectingWalletRef.current) {
      try {
        await connectWallet();
      } catch {
        // Continue waiting below in case wallet state is still propagating.
      }
    }

    return new Promise<string>((resolve, reject) => {
      const startedAt = Date.now();
      let reconnectAttempted = walletConnectedRef.current
        || !walletInfoRef.current
        || connectingWalletRef.current;
      const interval = window.setInterval(() => {
        const resolvedAddress = getReconnectAddress();
        if (resolvedAddress) {
          window.clearInterval(interval);
          resolve(resolvedAddress);
          return;
        }
        if (!reconnectAttempted && Date.now() - startedAt > 3_000) {
          reconnectAttempted = true;
          Promise.resolve(connectWallet() as any).catch(() => {
            // Keep waiting until timeout.
          });
        }
        if (Date.now() - startedAt >= timeoutMs) {
          window.clearInterval(interval);
          reject(new Error('You are not connected to Wallet'));
        }
      }, 300);
    });
  }, [aeSdk, connectWallet, targetAddress]);

  const checkNameAvailability = useCallback(async (name: string) => {
    const normalizedName = normalizeName(name).replace(/\.chain$/u, '');
    const fullName = `${normalizedName}.chain` as `${string}.chain`;
    const readSdk = staticAeSdk || sdk;
    const lookups = [
      async () => {
        if (typeof (readSdk as any)?.getName !== 'function') return null;
        return (readSdk as any).getName(fullName);
      },
      async () => {
        if (typeof (readSdk as any)?.api?.getNameEntryByName !== 'function') return null;
        return (readSdk as any).api.getNameEntryByName(fullName);
      },
      async () => fetchNameRecord(fullName),
    ];
    const runLookup = async (index: number): Promise<boolean> => {
      if (index >= lookups.length) return true;
      try {
        const result = await lookups[index]();
        if (result == null) return runLookup(index + 1);
        return false;
      } catch (error) {
        if (isNameNotFoundError(error)) return true;
        if (index === lookups.length - 1) {
          throw new Error('Unable to verify chain name availability right now');
        }
        return runLookup(index + 1);
      }
    };

    return runLookup(0);
  }, [sdk, staticAeSdk]);

  const claimSponsoredChainName = useCallback(async (params: {
    name: string;
    onSubmitted?: (status: ChainNameClaimStatusResponse) => void;
    onStatusChange?: (status: ChainNameClaimStatusResponse) => void;
    pollIntervalMs?: number;
    maxAttempts?: number;
  }) => {
    let reconnectedAddress: string | undefined;
    try {
      reconnectedAddress = await waitForWalletReconnect(targetAddress || connectedAddress);
    } catch {
      // Keep original error path below if extension reconnect fails.
    }
    const target = targetAddress || reconnectedAddress || connectedAddress;
    if (!target) throw new Error('Connect your wallet to claim a .chain name');
    const signerAddress = reconnectedAddress || connectedAddress;
    if (!signerAddress || normalizeAddress(signerAddress) !== normalizeAddress(target)) {
      throw new Error('Connect the wallet for this profile to claim a .chain name');
    }

    const normalizedName = normalizeName(params.name).replace(/\.chain$/u, '');
    const challenge = await SuperheroApi.createChainNameChallenge(target);
    const signature = await signMessageWithSdk(aeSdk, target, challenge.message).catch((error) => {
      throw error instanceof Error
        ? error
        : new Error('Wallet message signing is not available');
    });
    const signatureHex = normalizeSignatureHex(signature);

    const claimResponse = await SuperheroApi.claimChainName({
      address: target,
      name: normalizedName,
      challenge_nonce: challenge.nonce,
      challenge_expires_at: String(challenge.expires_at),
      signature_hex: signatureHex,
    });

    const initialStatus: ChainNameClaimStatusResponse = {
      status: claimResponse.status || 'pending',
      name: `${normalizedName}.chain`,
    };
    params.onSubmitted?.(initialStatus);
    params.onStatusChange?.(initialStatus);

    const fullName = `${normalizedName}.chain`;
    const pollIntervalMs = params.pollIntervalMs ?? 5_000;
    const maxAttempts = params.maxAttempts ?? 120;
    const verifyClaimProgress = async (
      status: ChainNameClaimStatusResponse,
    ): Promise<ChainNameClaimStatusResponse> => {
      if (String(status.status || '').toLowerCase() === 'failed') return buildVerifiedStatus(fullName, status);

      const hasPreclaim = Boolean(status.preclaim_tx_hash);
      const hasClaim = Boolean(status.claim_tx_hash);
      const hasUpdate = Boolean(status.update_tx_hash);
      const hasTransfer = Boolean(status.transfer_tx_hash);

      if (hasPreclaim && !(await isTransactionMined(status.preclaim_tx_hash))) {
        return buildVerifiedStatus(fullName, status, { status: 'preclaim_pending' });
      }
      if (hasClaim && !(await isTransactionMined(status.claim_tx_hash))) {
        return buildVerifiedStatus(fullName, status, { status: 'claim_pending' });
      }
      if (hasUpdate && !(await isTransactionMined(status.update_tx_hash))) {
        return buildVerifiedStatus(fullName, status, { status: 'update_pending' });
      }
      if (hasTransfer && !(await isTransactionMined(status.transfer_tx_hash))) {
        return buildVerifiedStatus(fullName, status, { status: 'transfer_pending' });
      }

      const statusValue = String(status.status || '').toLowerCase();
      if (hasTransfer || statusValue === 'completed') {
        const finalized = await isNameClaimFinalized(fullName, target);
        if (!finalized) {
          return buildVerifiedStatus(fullName, status, { status: 'transfer_pending' });
        }
        return buildVerifiedStatus(fullName, status, { status: 'completed' });
      }

      return buildVerifiedStatus(fullName, status, { status: 'queued' });
    };

    const pollStatus = async (
      attempt: number,
      latestStatus: ChainNameClaimStatusResponse,
    ): Promise<ChainNameClaimStatusResponse> => {
      const verifiedStatus = await verifyClaimProgress(latestStatus);
      params.onStatusChange?.(verifiedStatus);
      const latestStatusName = String(verifiedStatus.status || '').toLowerCase();
      if (['completed', 'failed'].includes(latestStatusName)) return verifiedStatus;
      if (attempt >= maxAttempts) return verifiedStatus;

      await wait(pollIntervalMs);
      const nextStatus = await SuperheroApi.getChainNameClaimStatus(target);
      if (!nextStatus.name) nextStatus.name = fullName;
      return pollStatus(attempt + 1, nextStatus);
    };

    const latestStatus = await pollStatus(0, initialStatus);
    const finalStatusName = String(latestStatus.status || '').toLowerCase();
    if (!['completed', 'failed'].includes(finalStatusName)) {
      throw new Error('Timed out while waiting for .chain name claim to finish');
    }
    if (finalStatusName === 'failed') {
      throw new Error(latestStatus.error || 'Failed to claim .chain name');
    }

    return {
      ...latestStatus,
      name: latestStatus.name || `${normalizedName}.chain`,
      expiresAt: extractChainNameExpiry(latestStatus),
    };
  }, [aeSdk, connectedAddress, targetAddress, waitForWalletReconnect]);

  return {
    canClaim: Boolean(
      connectedAddress
      && (
        !targetAddress
        || normalizeAddress(targetAddress) === normalizeAddress(connectedAddress)
      ),
    ),
    checkNameAvailability,
    claimSponsoredChainName,
  };
}
