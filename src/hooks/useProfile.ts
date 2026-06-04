import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import {
  type AddressLinkClaimResponse,
  type ProfileAggregate,
  type XAddressLinkClaimResponse,
  SuperheroApi,
} from '@/api/backend';
import { signAndVerifyLinkMessage } from '@/utils/signLinkMessage';
import { normalizeName } from '@/utils/chainNames';
import {
  normalizeAddress,
  sdkHasAccount,
} from '@/utils/walletSdk';
import { useAeSdk } from './useAeSdk';
import { useWalletReconnect } from './useWalletReconnect';
import { useWalletConnect } from './useWalletConnect';

type SetProfileInput = {
  fullname: string;
  bio: string;
  avatarurl: string;
  username?: string;
  chainName?: string;
  chainExpiresAt?: number | null;
};

export function useProfile(targetAddress?: string) {
  const {
    activeAccount,
    aeSdk,
    sdk,
    staticAeSdk,
    addStaticAccount,
    signMessage,
  } = useAeSdk();
  const {
    connectWallet,
    walletConnected,
  } = useWalletConnect();
  const activeAccountRef = useRef<string | undefined>(activeAccount);

  useEffect(() => {
    activeAccountRef.current = activeAccount;
  }, [activeAccount]);

  const waitForWalletReconnect = useWalletReconnect({
    activeAccount,
    targetAddress,
    signerSdks: [staticAeSdk, sdk],
    walletConnected,
    restoreAccount: addStaticAccount,
    defaultTimeoutMs: 25_000,
  });

  const canEdit = useMemo(
    () => !!activeAccount && (!targetAddress || targetAddress === activeAccount),
    [activeAccount, targetAddress],
  );

  const ensureWalletReadyForMessageSigning = useCallback(async (expectedAddress: string) => {
    if (!expectedAddress?.startsWith('ak_')) {
      throw new Error('Missing address for wallet signature');
    }

    const matchesExpectedAddress = (candidate?: string | null) => (
      normalizeAddress(candidate) === normalizeAddress(expectedAddress)
    );
    const hasExpectedSigner = () => (
      sdkHasAccount(aeSdk, expectedAddress)
      || sdkHasAccount(staticAeSdk, expectedAddress)
      || sdkHasAccount(sdk, expectedAddress)
      || matchesExpectedAddress(activeAccountRef.current)
    );

    if (hasExpectedSigner()) return;

    if (!walletConnected || !sdkHasAccount(aeSdk, expectedAddress)) {
      await connectWallet();
    }

    const startedAt = Date.now();
    while (Date.now() - startedAt < 10_000) {
      if (hasExpectedSigner()) return;
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => {
        window.setTimeout(resolve, 250);
      });
    }

    throw new Error('Connected wallet account does not match X verification address');
  }, [aeSdk, connectWallet, sdk, staticAeSdk, walletConnected]);

  const getProfile = useCallback(async (address?: string): Promise<ProfileAggregate | null> => {
    try {
      const addr = (address || targetAddress || activeAccount) as string | undefined;
      if (!addr) return null;
      return await SuperheroApi.getProfile(addr);
    } catch {
      return null;
    }
  }, [targetAddress, activeAccount]);

  /** Profile fields from GET /api/profile (legacy name kept for callers). */
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
      const aggregate = await getProfile(address);
      const profile = aggregate?.profile;
      if (!profile) return null;
      const chainExpiresAt = profile.chain_expires_at != null
        ? Number(profile.chain_expires_at)
        : null;
      return {
        fullname: profile.fullname ?? '',
        bio: profile.bio ?? '',
        avatarurl: profile.avatarurl ?? '',
        username: profile.username ?? null,
        x_username: profile.x_username ?? null,
        chain_name: profile.chain_name ?? null,
        display_source: profile.display_source,
        chain_expires_at: Number.isFinite(chainExpiresAt) && chainExpiresAt > 0
          ? chainExpiresAt
          : null,
      };
    } catch {
      return null;
    }
  }, [getProfile]);

  const setProfile = useCallback(async (data: SetProfileInput): Promise<string | undefined> => {
    const connectedAddress = await waitForWalletReconnect(targetAddress);
    const target = targetAddress || connectedAddress;
    await ensureWalletReadyForMessageSigning(target);

    const current = await getProfileOnChain(target);
    const payload: {
      fullname?: string;
      bio?: string;
      avatarurl?: string;
      username?: string;
    } = {};
    const nextFullname = data.fullname ?? '';
    const nextAvatar = data.avatarurl ?? '';
    const normalizedUsername = normalizeName(data.username || '');
    const currentUsername = normalizeName(current?.username || '');

    if (nextFullname !== (current?.fullname ?? '')) payload.fullname = nextFullname;
    if (nextAvatar !== (current?.avatarurl ?? '')) payload.avatarurl = nextAvatar;
    if (normalizedUsername !== currentUsername) payload.username = normalizedUsername;
    /** Bio is linked via address-links; do not PATCH bio from this entrypoint. */

    if (!Object.keys(payload).length) return undefined;

    const { challenge } = await SuperheroApi.issueProfileChallenge(target, payload);
    const signature = await signAndVerifyLinkMessage(target, signMessage, challenge, {
      request: {
        type: 'profile-update',
        address: target,
        payload,
        message: challenge,
      },
    });
    await SuperheroApi.updateProfile(target, {
      ...payload,
      challenge,
      signature,
    });
    return undefined;
  }, [
    ensureWalletReadyForMessageSigning,
    getProfileOnChain,
    signMessage,
    targetAddress,
    waitForWalletReconnect,
  ]);

  const submitXAddressLink = useCallback(async (
    address: string,
    claim: XAddressLinkClaimResponse,
    signature: string,
  ) => {
    const res = await SuperheroApi.submitXAddressLink({
      address,
      value: claim.value,
      nonce: claim.nonce,
      signature,
      verification_token: claim.verification_token,
    });
    return res.txHash;
  }, []);

  const completeXAddressLink = useCallback(async (claim: XAddressLinkClaimResponse) => {
    if (!targetAddress) {
      throw new Error('Missing address for X verification');
    }
    await addStaticAccount(targetAddress);
    await ensureWalletReadyForMessageSigning(targetAddress);
    const signature = await signAndVerifyLinkMessage(targetAddress, signMessage, claim.message, {
      request: {
        type: 'address-link-x-submit',
        address: targetAddress,
        value: claim.value,
        nonce: claim.nonce,
        verification_token: claim.verification_token,
        message: claim.message,
      },
    });
    return submitXAddressLink(targetAddress, claim, signature);
  }, [
    addStaticAccount,
    ensureWalletReadyForMessageSigning,
    signMessage,
    submitXAddressLink,
    targetAddress,
  ]);

  const linkXWithAccessToken = useCallback(async (params: {
    address?: string;
    accessToken: string;
  }) => {
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
    await addStaticAccount(target);
    await ensureWalletReadyForMessageSigning(target);
    const claim = await SuperheroApi.claimXAddressLink(target, params.accessToken.trim());
    const signature = await signAndVerifyLinkMessage(target, signMessage, claim.message, {
      request: {
        type: 'address-link-x-submit',
        address: target,
        value: claim.value,
        nonce: claim.nonce,
        verification_token: claim.verification_token,
        message: claim.message,
      },
    });
    return submitXAddressLink(target, claim, signature);
  }, [
    addStaticAccount,
    ensureWalletReadyForMessageSigning,
    signMessage,
    submitXAddressLink,
    targetAddress,
    waitForWalletReconnect,
  ]);

  const submitBioAddressLink = useCallback(async (
    address: string,
    claim: AddressLinkClaimResponse,
    signature: string,
  ) => {
    const res = await SuperheroApi.submitBioAddressLink({
      address,
      value: claim.value,
      nonce: claim.nonce,
      signature,
      verification_token: claim.verification_token,
    });
    return res.txHash;
  }, []);

  const linkBio = useCallback(async (params: {
    address?: string;
    bio: string;
  }) => {
    const target = params.address || targetAddress;
    if (!target) {
      throw new Error('Missing address for bio link');
    }
    const value = params.bio.trim();
    if (!value) {
      throw new Error('Bio is required to link');
    }
    await addStaticAccount(target);
    await ensureWalletReadyForMessageSigning(target);
    const claim = await SuperheroApi.claimBioAddressLink(target, value);
    const signature = await signAndVerifyLinkMessage(target, signMessage, claim.message, {
      request: {
        type: 'address-link-bio-submit',
        address: target,
        value: claim.value,
        nonce: claim.nonce,
        verification_token: claim.verification_token,
        message: claim.message,
      },
    });
    return submitBioAddressLink(target, claim, signature);
  }, [
    addStaticAccount,
    ensureWalletReadyForMessageSigning,
    signMessage,
    submitBioAddressLink,
    targetAddress,
  ]);

  const submitSiteAddressLink = useCallback(async (
    address: string,
    claim: AddressLinkClaimResponse,
    signature: string,
  ) => {
    const res = await SuperheroApi.submitSiteAddressLink({
      address,
      value: claim.value,
      nonce: claim.nonce,
      signature,
      verification_token: claim.verification_token,
    });
    return res.txHash;
  }, []);

  const linkSite = useCallback(async (params: {
    address?: string;
    site: string;
  }) => {
    const target = params.address || targetAddress;
    if (!target) {
      throw new Error('Missing address for site link');
    }
    const value = params.site.trim();
    if (!value) {
      throw new Error('Site is required to link');
    }
    await addStaticAccount(target);
    await ensureWalletReadyForMessageSigning(target);
    const claim = await SuperheroApi.claimSiteAddressLink(target, value);
    const signature = await signAndVerifyLinkMessage(target, signMessage, claim.message, {
      request: {
        type: 'address-link-site-submit',
        address: target,
        value: claim.value,
        nonce: claim.nonce,
        verification_token: claim.verification_token,
        message: claim.message,
      },
    });
    return submitSiteAddressLink(target, claim, signature);
  }, [
    addStaticAccount,
    ensureWalletReadyForMessageSigning,
    signMessage,
    submitSiteAddressLink,
    targetAddress,
  ]);

  const submitPreferredAensNameAddressLink = useCallback(async (
    address: string,
    claim: AddressLinkClaimResponse,
    signature: string,
  ) => {
    const res = await SuperheroApi.submitPreferredAensNameAddressLink({
      address,
      value: claim.value,
      nonce: claim.nonce,
      signature,
      verification_token: claim.verification_token,
    });
    return res.txHash;
  }, []);

  const linkPreferredAensName = useCallback(async (params: {
    address?: string;
    chainName: string;
  }) => {
    const target = params.address || targetAddress;
    if (!target) {
      throw new Error('Missing address for preferred name link');
    }
    const value = normalizeName(params.chainName);
    if (!value) {
      throw new Error('Preferred name is required to link');
    }
    await addStaticAccount(target);
    await ensureWalletReadyForMessageSigning(target);
    const claim = await SuperheroApi.claimPreferredAensNameAddressLink(target, value);
    const signature = await signAndVerifyLinkMessage(target, signMessage, claim.message, {
      request: {
        type: 'address-link-prefaens-submit',
        address: target,
        value: claim.value,
        nonce: claim.nonce,
        verification_token: claim.verification_token,
        message: claim.message,
      },
    });
    return submitPreferredAensNameAddressLink(target, claim, signature);
  }, [
    addStaticAccount,
    ensureWalletReadyForMessageSigning,
    signMessage,
    submitPreferredAensNameAddressLink,
    targetAddress,
  ]);

  const unlinkPreferredAensName = useCallback(async (address?: string) => {
    const target = address || targetAddress;
    if (!target) {
      throw new Error('Missing address for preferred name unlink');
    }
    await addStaticAccount(target);
    await ensureWalletReadyForMessageSigning(target);
    const unclaim = await SuperheroApi.unclaimPreferredAensNameAddressLink(target);
    const signature = await signAndVerifyLinkMessage(target, signMessage, unclaim.message, {
      request: {
        type: 'address-link-prefaens-unclaim',
        address: target,
        nonce: unclaim.nonce,
        message: unclaim.message,
      },
    });
    const res = await SuperheroApi.submitPreferredAensNameAddressLinkUnclaim({
      address: target,
      nonce: unclaim.nonce,
      signature,
    });
    return res.txHash;
  }, [addStaticAccount, ensureWalletReadyForMessageSigning, signMessage, targetAddress]);

  const unlinkBio = useCallback(async (address?: string) => {
    const target = address || targetAddress;
    if (!target) {
      throw new Error('Missing address for bio unlink');
    }
    await addStaticAccount(target);
    await ensureWalletReadyForMessageSigning(target);
    const unclaim = await SuperheroApi.unclaimBioAddressLink(target);
    const signature = await signAndVerifyLinkMessage(target, signMessage, unclaim.message, {
      request: {
        type: 'address-link-bio-unclaim',
        address: target,
        nonce: unclaim.nonce,
        message: unclaim.message,
      },
    });
    const res = await SuperheroApi.submitBioAddressLinkUnclaim({
      address: target,
      nonce: unclaim.nonce,
      signature,
    });
    return res.txHash;
  }, [addStaticAccount, ensureWalletReadyForMessageSigning, signMessage, targetAddress]);

  const unlinkSite = useCallback(async (address?: string) => {
    const target = address || targetAddress;
    if (!target) {
      throw new Error('Missing address for site unlink');
    }
    await addStaticAccount(target);
    await ensureWalletReadyForMessageSigning(target);
    const unclaim = await SuperheroApi.unclaimSiteAddressLink(target);
    const signature = await signAndVerifyLinkMessage(target, signMessage, unclaim.message, {
      request: {
        type: 'address-link-site-unclaim',
        address: target,
        nonce: unclaim.nonce,
        message: unclaim.message,
      },
    });
    const res = await SuperheroApi.submitSiteAddressLinkUnclaim({
      address: target,
      nonce: unclaim.nonce,
      signature,
    });
    return res.txHash;
  }, [addStaticAccount, ensureWalletReadyForMessageSigning, signMessage, targetAddress]);

  const unlinkXAccount = useCallback(async (address?: string) => {
    const target = address || targetAddress;
    if (!target) {
      throw new Error('Missing address for X unlink');
    }
    await addStaticAccount(target);
    await ensureWalletReadyForMessageSigning(target);
    const unclaim = await SuperheroApi.unclaimXAddressLink(target);
    const signature = await signAndVerifyLinkMessage(target, signMessage, unclaim.message, {
      request: {
        type: 'address-link-x-unclaim',
        address: target,
        nonce: unclaim.nonce,
        message: unclaim.message,
      },
    });
    const res = await SuperheroApi.submitXAddressLinkUnclaim({
      address: target,
      nonce: unclaim.nonce,
      signature,
    });
    return res.txHash;
  }, [addStaticAccount, ensureWalletReadyForMessageSigning, signMessage, targetAddress]);

  return {
    canEdit,
    isConfigured: true,
    getProfile,
    getProfileOnChain,
    setProfile,
    linkXWithAccessToken,
    completeXAddressLink,
    unlinkXAccount,
    linkBio,
    unlinkBio,
    linkSite,
    unlinkSite,
    linkPreferredAensName,
    unlinkPreferredAensName,
  };
}
