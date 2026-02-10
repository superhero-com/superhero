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
    const matchesExpectedAddress = (account?: string) => {
      if (!account) return false;
      if (!knownAddress) return true;
      return normalizeAddress(account) === normalizeAddress(knownAddress);
    };

    const immediate = activeAccountRef.current;
    if (matchesExpectedAddress(immediate)) return immediate as string;

    if (knownAddress) {
      try {
        await addStaticAccount(knownAddress);
      } catch {
        // Continue waiting; provider/init might not be ready yet.
      }
      if (matchesExpectedAddress(activeAccountRef.current)) {
        return activeAccountRef.current as string;
      }
    }

    return new Promise<string>((resolve, reject) => {
      const startedAt = Date.now();
      let restoreAttempted = false;
      const interval = setInterval(() => {
        if (matchesExpectedAddress(activeAccountRef.current)) {
          clearInterval(interval);
          resolve(activeAccountRef.current as string);
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
  }, [addStaticAccount, targetAddress]);

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

  const initializeProfileContract = useCallback(async () => {
    const profileContractAddress = CONFIG.PROFILE_REGISTRY_CONTRACT_ADDRESS as `ct_${string}` | undefined;
    if (!profileContractAddress?.trim()) {
      throw new Error('PROFILE_REGISTRY_CONTRACT_ADDRESS is not configured');
    }
    // Prefer static SDK for post-redirect flows: it can sign via deep link once
    // addStaticAccount(address) has restored the account, even if aepp wallet
    // reconnection is still in progress.
    const signerSdk = staticAeSdk || sdk;
    return signerSdk.initializeContract({
      aci: PROFILE_REGISTRY_ACI as any,
      address: profileContractAddress,
    });
  }, [sdk, staticAeSdk]);

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
      const contract = await initializeProfileContract();
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
    const contract = await initializeProfileContract();
    const current = await getProfileOnChain(target);
    const nextFullname = data.fullname || '';
    const nextBio = data.bio || '';
    const nextAvatar = data.avatarurl || '';

    let txHash: string | undefined;
    const shouldSetProfile = !current
      || current.fullname !== nextFullname
      || current.bio !== nextBio
      || current.avatarurl !== nextAvatar;
    if (shouldSetProfile) {
      const setProfileResult: any = await (contract as any).set_profile(
        nextFullname,
        nextBio,
        nextAvatar,
      );
      txHash = extractTxHash(setProfileResult);
    }

    const normalizedUsername = normalizeName(data.username || '');
    const currentUsername = normalizeName(current?.username || '');
    const shouldUpdateUsername = normalizedUsername !== currentUsername
      && (normalizedUsername.length > 0 || currentUsername.length > 0);
    if (shouldUpdateUsername) {
      const tx: any = await (contract as any).set_custom_name(normalizedUsername);
      txHash = extractTxHash(tx) || txHash;
    }

    const normalizedChainName = normalizeName(data.chainName || '');
    const currentChainName = normalizeName(current?.chain_name || '');
    const currentChainExpiresAt = Number(current?.chain_expires_at || 0);
    const nextChainExpiresAt = Number(data.chainExpiresAt || 0);
    if (normalizedChainName) {
      const shouldSetChainName = normalizedChainName !== currentChainName
        || (Number.isFinite(nextChainExpiresAt)
          && nextChainExpiresAt > 0
          && currentChainExpiresAt !== nextChainExpiresAt);
      if (shouldSetChainName) {
        if (!Number.isFinite(nextChainExpiresAt) || nextChainExpiresAt <= 0) {
          throw new Error('Missing chain name expiration');
        }
        const tx: any = await (contract as any).set_chain_name(
          normalizedChainName,
          nextChainExpiresAt,
        );
        txHash = extractTxHash(tx) || txHash;
      }
    } else if (currentChainName) {
      const tx: any = await (contract as any).clear_chain_name();
      txHash = extractTxHash(tx) || txHash;
    }

    if (data.displaySource) {
      const currentDisplaySource = fromContractDisplaySource(current?.display_source);
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
    const connectedAddress = await waitForWalletReconnect(params.address || targetAddress);
    const target = params.address || targetAddress || connectedAddress;
    if (!target) {
      throw new Error('Missing address for X verification');
    }
    if (!params.accessToken?.trim()) {
      throw new Error('Missing X OAuth token');
    }
    const contract = await initializeProfileContract();
    const attestation = await SuperheroApi.createXAttestation(target, params.accessToken.trim());
    const res: any = await (contract as any).set_x_name_with_attestation(
      attestation.x_username,
      attestation.expiry,
      attestation.nonce,
      hexToUint8Array(attestation.signature_hex),
    );
    return res?.hash || res?.transactionHash || res?.tx?.hash;
  }, [targetAddress, initializeProfileContract, waitForWalletReconnect]);

  /** Complete X verification using an attestation (e.g. from OAuth callback). */
  const completeXWithAttestation = useCallback(async (attestation: XAttestationResponse) => {
    await waitForWalletReconnect(targetAddress);
    const contract = await initializeProfileContract();
    const res: any = await (contract as any).set_x_name_with_attestation(
      attestation.x_username,
      attestation.expiry,
      attestation.nonce,
      hexToUint8Array(attestation.signature_hex),
    );
    return res?.hash || res?.transactionHash || res?.tx?.hash;
  }, [initializeProfileContract, targetAddress, waitForWalletReconnect]);

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
