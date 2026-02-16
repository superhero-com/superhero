import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import {
  DisplaySource,
  type ProfileAggregate,
  type XAttestationResponse,
  SuperheroApi,
} from '@/api/backend';
import { CONFIG } from '@/config';
import PROFILE_REGISTRY_ACI from '@/api/ProfileRegistryACI.json';
import { useAeSdk } from './useAeSdk';

const normalizeName = (value: string) => value.trim().toLowerCase();
const normalizeAddress = (value?: string | null) => (value || '').trim().toLowerCase();
type DisplaySourceVariant = { Custom: [] } | { Chain: [] } | { X: [] };

const toContractDisplaySource = (source: DisplaySource): DisplaySourceVariant => {
  if (source === 'chain') return { Chain: [] };
  if (source === 'x') return { X: [] };
  return { Custom: [] };
};

type OptionVariant<T> = { Some: [T] } | { None: [] };
const toOption = <T>(value: T | null | undefined): OptionVariant<T> => (
  value == null ? { None: [] } : { Some: [value] }
);

const sdkHasAccount = (candidate: any, expectedAddress?: string): boolean => {
  const current = candidate?._accounts?.current;
  if (!current || typeof current !== 'object') return false;
  const addresses = Object.keys(current);
  if (!addresses.length) return false;
  if (!expectedAddress) return true;
  const target = normalizeAddress(expectedAddress);
  return addresses.some((addr) => normalizeAddress(addr) === target);
};

const fromContractDisplaySource = (source: unknown): DisplaySource | undefined => {
  if (!source || typeof source !== 'object') return undefined;
  if ('Chain' in (source as Record<string, unknown>)) return 'chain';
  if ('X' in (source as Record<string, unknown>)) return 'x';
  if ('Custom' in (source as Record<string, unknown>)) return 'custom';
  return undefined;
};

const hexToUint8Array = (hex: string): Uint8Array => {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }
  return bytes;
};

const extractTxHash = (tx: any): string | undefined => tx?.hash
  || tx?.transactionHash
  || tx?.tx?.hash;

type SetProfileInput = {
  fullname: string;
  bio: string;
  avatarurl: string;
  username?: string;
  chainName?: string;
  chainExpiresAt?: number | null;
  displaySource?: DisplaySource;
};

export function useProfile(targetAddress?: string) {
  const {
    activeAccount,
    sdk,
    staticAeSdk,
    addStaticAccount,
  } = useAeSdk();
  const activeAccountRef = useRef<string | undefined>(activeAccount);

  useEffect(() => {
    activeAccountRef.current = activeAccount;
  }, [activeAccount]);

  /**
   * After OAuth redirects, wallet reconnection can be slightly delayed.
   * Wait for an active account before write tx calls to avoid transient
   * "wallet not connected" errors right after redirects.
   */
  const waitForWalletReconnect = useCallback(async (
    expectedAddress?: string,
    timeoutMs = 25_000,
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
      && (
        sdkHasAccount(staticAeSdk, knownAddress)
        || sdkHasAccount(sdk, knownAddress)
      )
    );
    const getReconnectAddress = (): string | null => {
      const current = activeAccountRef.current;
      if (matchesExpectedAddress(current)) {
        return current as string;
      }
      if (hasKnownSignerReady()) {
        return knownAddress as string;
      }
      return null;
    };

    const immediate = getReconnectAddress();
    if (immediate) {
      // Ensure static signer is ready as a fallback on refresh/reconnect races.
      if (knownAddress) {
        try {
          await addStaticAccount(knownAddress);
        } catch {
          // aepp signer may still be available; continue.
        }
      }
      return immediate as string;
    }

    if (knownAddress) {
      try {
        await addStaticAccount(knownAddress);
      } catch {
        // Continue waiting; provider/init might not be ready yet.
      }
      if (matchesExpectedAddress(activeAccountRef.current)) {
        return activeAccountRef.current as string;
      }
      if (hasKnownSignerReady()) {
        return knownAddress as string;
      }
    }

    return new Promise<string>((resolve, reject) => {
      const startedAt = Date.now();
      let restoreAttempted = false;
      const interval = setInterval(() => {
        const resolvedAddress = getReconnectAddress();
        if (resolvedAddress) {
          clearInterval(interval);
          resolve(resolvedAddress);
          return;
        }
        if (!restoreAttempted && knownAddress && Date.now() - startedAt > 3_000) {
          restoreAttempted = true;
          Promise.resolve(addStaticAccount(knownAddress) as any).catch(() => {
            // Keep waiting until timeout.
          });
        }
        if (Date.now() - startedAt >= timeoutMs) {
          clearInterval(interval);
          reject(new Error('You are not connected to Wallet'));
        }
      }, 300);
    });
  }, [addStaticAccount, sdk, staticAeSdk, targetAddress]);

  const canEdit = useMemo(
    () => !!activeAccount && (!targetAddress || targetAddress === activeAccount),
    [activeAccount, targetAddress],
  );

  const getProfile = useCallback(async (address?: string): Promise<ProfileAggregate | null> => {
    try {
      const addr = (address || targetAddress || activeAccount) as string | undefined;
      if (!addr) return null;
      return await SuperheroApi.getProfile(addr);
    } catch {
      return null;
    }
  }, [targetAddress, activeAccount]);

  const initializeProfileContract = useCallback(async (
    expectedAddress?: string,
    options?: { restoreSigner?: boolean; preferStaticSigner?: boolean },
  ) => {
    const profileContractAddress = CONFIG.PROFILE_REGISTRY_CONTRACT_ADDRESS as `ct_${string}` | undefined;
    if (!profileContractAddress?.trim()) {
      throw new Error('PROFILE_REGISTRY_CONTRACT_ADDRESS is not configured');
    }

    const shouldRestoreSigner = Boolean(options?.restoreSigner);
    const shouldPreferStaticSigner = Boolean(options?.preferStaticSigner);
    if (shouldRestoreSigner && expectedAddress && !sdkHasAccount(staticAeSdk, expectedAddress)) {
      try {
        await addStaticAccount(expectedAddress);
      } catch {
        // Keep fallback logic below.
      }
    }

    let signerSdk = sdkHasAccount(staticAeSdk, expectedAddress)
      ? staticAeSdk
      : (sdkHasAccount(sdk, expectedAddress) ? sdk : (sdk || staticAeSdk));
    if (shouldPreferStaticSigner && staticAeSdk) {
      signerSdk = staticAeSdk;
    }
    if (!signerSdk) {
      throw new Error('SDK is not initialized');
    }
    return signerSdk.initializeContract({
      aci: PROFILE_REGISTRY_ACI as any,
      address: profileContractAddress,
    });
  }, [sdk, staticAeSdk, addStaticAccount]);

  /** Dry-run get_profile(owner) on the ProfileRegistry contract. Returns profile record or null. */
  const getProfileOnChain = useCallback(async (address?: string): Promise<{
    fullname: string;
    bio: string;
    avatarurl: string;
    username?: string | null;
    x_username?: string | null;
    chain_name?: string | null;
    display_source?: unknown;
    chain_expires_at?: number | null;
  } | null> => {
    try {
      const addr = (address || targetAddress || activeAccount) as string | undefined;
      if (!addr) return null;
      const contract = await initializeProfileContract(addr, { restoreSigner: false });
      const tx: any = await (contract as any).get_profile(addr);
      const raw = tx?.decodedResult ?? tx?.result?.decodedResult ?? tx;
      if (raw == null) return null;
      if (typeof raw === 'object' && 'None' in raw) return null;
      let profile: unknown = raw;
      if (typeof raw === 'object' && raw.Some != null) {
        profile = Array.isArray(raw.Some) ? raw.Some[0] : raw.Some;
      }
      if (profile && typeof profile === 'object' && 'bio' in profile) {
        return profile as any;
      }
      return null;
    } catch {
      return null;
    }
  }, [targetAddress, activeAccount, initializeProfileContract]);

  const setProfile = useCallback(async (data: SetProfileInput): Promise<string | undefined> => {
    const connectedAddress = await waitForWalletReconnect(targetAddress);
    const target = targetAddress || connectedAddress;
    const contract = await initializeProfileContract(target, { restoreSigner: true });
    const current = await getProfileOnChain(target);
    const nextFullname = data.fullname || '';
    const nextBio = data.bio || '';
    const nextAvatar = data.avatarurl || '';

    let txHash: string | undefined;
    const shouldSetProfile = !current
      || current.fullname !== nextFullname
      || current.bio !== nextBio
      || current.avatarurl !== nextAvatar;

    const normalizedUsername = normalizeName(data.username || '');
    const currentUsername = normalizeName(current?.username || '');
    const shouldUpdateUsername = normalizedUsername !== currentUsername
      && (normalizedUsername.length > 0 || currentUsername.length > 0);

    const normalizedChainName = normalizeName(data.chainName || '');
    const currentChainName = normalizeName(current?.chain_name || '');
    const currentChainExpiresAt = Number(current?.chain_expires_at || 0);
    const nextChainExpiresAt = Number(data.chainExpiresAt || 0);
    const hasValidChainExpiry = Number.isFinite(nextChainExpiresAt) && nextChainExpiresAt > 0;
    const shouldSetChainName = normalizedChainName.length > 0 && (
      normalizedChainName !== currentChainName
      || (hasValidChainExpiry && currentChainExpiresAt !== nextChainExpiresAt)
    );
    const shouldClearChainName = !normalizedChainName && !!currentChainName;

    const currentDisplaySource = fromContractDisplaySource(current?.display_source);
    const targetDisplaySource = data.displaySource || currentDisplaySource || 'custom';
    const shouldUpdateDisplaySource = currentDisplaySource !== targetDisplaySource;

    const shouldChangeChain = shouldSetChainName || shouldClearChainName;
    const changeCount = Number(shouldSetProfile)
      + Number(shouldUpdateUsername)
      + Number(shouldChangeChain)
      + Number(shouldUpdateDisplaySource);

    if (shouldSetProfile && !shouldUpdateUsername && !shouldChangeChain && !shouldUpdateDisplaySource) {
      const setProfileResult: any = await (contract as any).set_profile(
        nextFullname,
        nextBio,
        nextAvatar,
      );
      txHash = extractTxHash(setProfileResult) || txHash;
      return txHash;
    }

    /**
     * Use the full entrypoint only when there are multiple field changes in one submit.
     * For single-field updates, keep using dedicated entrypoints to avoid resending
     * unrelated profile fields.
     */
    if (changeCount > 1 && typeof (contract as any).set_profile_full === 'function') {
      if (normalizedChainName && !hasValidChainExpiry) {
        throw new Error('Missing chain name expiration');
      }
      const fullResult: any = await (contract as any).set_profile_full(
        nextFullname,
        nextBio,
        nextAvatar,
        toOption(normalizedUsername || null),
        toOption(normalizedChainName || null),
        toOption(hasValidChainExpiry ? nextChainExpiresAt : null),
        toContractDisplaySource(targetDisplaySource),
      );
      txHash = extractTxHash(fullResult) || txHash;
      return txHash;
    }

    if (shouldSetProfile) {
      const setProfileResult: any = await (contract as any).set_profile(
        nextFullname,
        nextBio,
        nextAvatar,
      );
      txHash = extractTxHash(setProfileResult);
    }

    if (shouldUpdateUsername) {
      const tx: any = await (contract as any).set_custom_name(normalizedUsername);
      txHash = extractTxHash(tx) || txHash;
    }

    if (shouldSetChainName) {
      if (!Number.isFinite(nextChainExpiresAt) || nextChainExpiresAt <= 0) {
        throw new Error('Missing chain name expiration');
      }
      const tx: any = await (contract as any).set_chain_name(
        normalizedChainName,
        nextChainExpiresAt,
      );
      txHash = extractTxHash(tx) || txHash;
    } else if (shouldClearChainName) {
      const tx: any = await (contract as any).clear_chain_name();
      txHash = extractTxHash(tx) || txHash;
    }

    if (data.displaySource) {
      if (currentDisplaySource !== data.displaySource) {
        const tx: any = await (contract as any).set_display_source(
          toContractDisplaySource(data.displaySource),
        );
        txHash = extractTxHash(tx) || txHash;
      }
    }
    return txHash;
  }, [getProfileOnChain, initializeProfileContract, targetAddress, waitForWalletReconnect]);

  const verifyXAndSave = useCallback(async (params: { address?: string; accessToken: string }) => {
    const expectedAddress = params.address || targetAddress;
    let connectedAddress: string | undefined;
    try {
      connectedAddress = await waitForWalletReconnect(expectedAddress);
    } catch {
      if (expectedAddress) {
        try {
          await addStaticAccount(expectedAddress);
          connectedAddress = expectedAddress;
        } catch {
          // Keep the original reconnect error path below if signer restore fails.
        }
      }
    }
    const target = params.address || targetAddress || connectedAddress;
    if (!target) {
      throw new Error('Missing address for X verification');
    }
    if (!params.accessToken?.trim()) {
      throw new Error('Missing X OAuth token');
    }
    const contract = await initializeProfileContract(target, { restoreSigner: true });
    const attestation = await SuperheroApi.createXAttestation(target, params.accessToken.trim());
    const res: any = await (contract as any).set_x_name_with_attestation(
      attestation.x_username,
      attestation.expiry,
      attestation.nonce,
      hexToUint8Array(attestation.signature_hex),
    );
    return res?.hash || res?.transactionHash || res?.tx?.hash;
  }, [addStaticAccount, targetAddress, initializeProfileContract, waitForWalletReconnect]);

  /** Complete X verification using an attestation (e.g. from OAuth callback). */
  const completeXWithAttestation = useCallback(async (attestation: XAttestationResponse) => {
    if (!targetAddress) {
      throw new Error('Missing address for X verification');
    }
    // In OAuth callback flow we already have the expected address from PKCE state.
    // Restoring signer directly is enough and avoids transient reconnect races.
    await addStaticAccount(targetAddress);
    const contract = await initializeProfileContract(targetAddress, {
      restoreSigner: true,
      preferStaticSigner: true,
    });
    const res: any = await (contract as any).set_x_name_with_attestation(
      attestation.x_username,
      attestation.expiry,
      attestation.nonce,
      hexToUint8Array(attestation.signature_hex),
    );
    return res?.hash || res?.transactionHash || res?.tx?.hash;
  }, [addStaticAccount, initializeProfileContract, targetAddress]);

  return {
    canEdit,
    isConfigured: Boolean(CONFIG.PROFILE_REGISTRY_CONTRACT_ADDRESS),
    getProfile,
    getProfileOnChain,
    setProfile,
    verifyXAndSave,
    completeXWithAttestation,
  };
}
