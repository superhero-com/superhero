import {
  useCallback,
} from 'react';
import {
  type ChainNameClaimStatusResponse,
  SuperheroApi,
} from '@/api/backend';
import {
  fetchNameRecord,
  isTransactionMined,
} from '@/utils/apiRead';
import { normalizeChainNameLabel, normalizeName } from '@/utils/chainNames';
import { normalizeLinkSignature } from '@/utils/signLinkMessage';
import {
  getSdkAddress,
  normalizeAddress,
} from '@/utils/walletSdk';
import { useAeSdk } from './useAeSdk';
import { useWalletReconnect } from './useWalletReconnect';
import { useWalletConnect } from './useWalletConnect';

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
const wait = (ms: number) => new Promise((resolve) => {
  window.setTimeout(resolve, ms);
});

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
  const connectedAddress = activeAccount || getSdkAddress(aeSdk) || getSdkAddress(sdk);
  const claimAddress = targetAddress || connectedAddress;
  const waitForWalletReconnect = useWalletReconnect({
    activeAccount,
    targetAddress,
    signerSdks: [aeSdk],
    walletConnected,
    walletInfo,
    connectingWallet,
    connectWallet,
    requireWalletConnectedForSigner: true,
  });

  const checkNameAvailability = useCallback(async (name: string) => {
    const normalizedName = normalizeChainNameLabel(name);
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

    const normalizedName = normalizeChainNameLabel(params.name);
    const challenge = await SuperheroApi.createChainNameChallenge(target);
    const signature = await signMessageWithSdk(aeSdk, target, challenge.message).catch((error) => {
      throw error instanceof Error
        ? error
        : new Error('Wallet message signing is not available');
    });
    const signatureHex = normalizeLinkSignature(signature);

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
    const minedTxHashes = new Set<string>();
    const isTxMinedOnce = async (txHash?: string | null) => {
      if (!txHash) return false;
      if (minedTxHashes.has(txHash)) return true;
      const mined = await isTransactionMined(txHash);
      if (mined) minedTxHashes.add(txHash);
      return mined;
    };
    const verifyClaimProgress = async (
      status: ChainNameClaimStatusResponse,
    ): Promise<ChainNameClaimStatusResponse> => {
      if (String(status.status || '').toLowerCase() === 'failed') return buildVerifiedStatus(fullName, status);

      const hasPreclaim = Boolean(status.preclaim_tx_hash);
      const hasClaim = Boolean(status.claim_tx_hash);
      const hasUpdate = Boolean(status.update_tx_hash);
      const hasTransfer = Boolean(status.transfer_tx_hash);

      if (hasPreclaim && !(await isTxMinedOnce(status.preclaim_tx_hash))) {
        return buildVerifiedStatus(fullName, status, { status: 'preclaim_pending' });
      }
      if (hasClaim && !(await isTxMinedOnce(status.claim_tx_hash))) {
        return buildVerifiedStatus(fullName, status, { status: 'claim_pending' });
      }
      if (hasUpdate && !(await isTxMinedOnce(status.update_tx_hash))) {
        return buildVerifiedStatus(fullName, status, { status: 'update_pending' });
      }
      if (hasTransfer && !(await isTxMinedOnce(status.transfer_tx_hash))) {
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
    claimAddress,
    connectedAddress,
    checkNameAvailability,
    claimSponsoredChainName,
  };
}
