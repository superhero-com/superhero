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
import {
  Encoded,
  Tag,
  type ContractMethodsBase,
  unpackTx,
} from '@aeternity/aepp-sdk';
import { CONFIG } from '@/config';
import { initializeContractTyped } from '@/libs/initializeContractTyped';
import { encodeProfileCallData, payForProfileTx } from '@/services/payForProfileTx';
import ADDRESS_LINK_ACI from '@/api/AddressLinkACI.json';
import { useAeSdk } from './useAeSdk';
import { useWalletReconnect } from './useWalletReconnect';
import { useWalletConnect } from './useWalletConnect';

type OptionVariant<T> = { Some: [T] } | { None: [] };
const toOption = <T>(value: T | null | undefined): OptionVariant<T> => (
  value == null ? { None: [] } : { Some: [value] }
);

const extractTxHash = (tx: any): string | undefined => tx?.hash
  || tx?.transactionHash
  || tx?.tx?.hash;
const extractSignedTx = (value: any): Encoded.Transaction | undefined => {
  if (typeof value === 'string' && value.startsWith('tx_')) return value as Encoded.Transaction;
  const nested = value?.tx || value?.transaction || value?.signedTx;
  if (typeof nested === 'string' && nested.startsWith('tx_')) return nested as Encoded.Transaction;
  return undefined;
};

type SetProfileInput = {
  fullname: string;
  bio: string;
  avatarurl: string;
  username?: string;
  chainName?: string;
  chainExpiresAt?: number | null;
};

type ProfileRegistryContractApi = ContractMethodsBase & {
  _calldata: {
    encode: (
      contractName: string,
      functionName: string,
      args: unknown[],
    ) => Encoded.ContractBytearray;
  };
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
    if (shouldRestoreSigner && expectedAddress) {
      try {
        await addStaticAccount(expectedAddress);
        // Restore/write flows use deep-link signer,
        // independent from aeSdk reconnect state.
        if (staticAeSdk) {
          const contract = await initializeContractTyped<ProfileRegistryContractApi>(
            staticAeSdk,
            { aci: ADDRESS_LINK_ACI, address: profileContractAddress },
          );
          return {
            contract,
            signerSdk: staticAeSdk,
            profileContractAddress,
          };
        }
      } catch {
        // Keep fallback logic below.
      }
    }

    let staticHasExpected = sdkHasAccount(staticAeSdk, expectedAddress);
    let sdkHasExpected = sdkHasAccount(sdk, expectedAddress);
    let signerSdk: any = shouldPreferStaticSigner && staticHasExpected
      ? staticAeSdk
      : undefined;

    if (!signerSdk) {
      if (sdkHasExpected) signerSdk = sdk;
      else if (staticHasExpected) signerSdk = staticAeSdk;
      else if (expectedAddress && shouldRestoreSigner) {
        // Ensure we can always sign for the requested account via deep-link fallback.
        try {
          await addStaticAccount(expectedAddress);
        } catch {
          // Keep fallback below.
        }
        staticHasExpected = sdkHasAccount(staticAeSdk, expectedAddress);
        sdkHasExpected = sdkHasAccount(sdk, expectedAddress);
        if (staticHasExpected) signerSdk = staticAeSdk;
        else if (sdkHasExpected) signerSdk = sdk;
      }
    }

    // No expectedAddress (read-only flow): keep legacy behavior.
    if (!signerSdk) {
      if (expectedAddress && shouldRestoreSigner) {
        // In write/restore flows, prefer deep-link signer even if account
        // propagation is still catching up after refresh.
        signerSdk = staticAeSdk || sdk;
      } else {
        signerSdk = sdk || staticAeSdk;
      }
    }
    if (!signerSdk) {
      throw new Error('SDK is not initialized');
    }
    const contract = await initializeContractTyped<ProfileRegistryContractApi>(
      signerSdk,
      { aci: ADDRESS_LINK_ACI as any, address: profileContractAddress },
    );
    return {
      contract,
      signerSdk,
      profileContractAddress,
    };
  }, [sdk, staticAeSdk, addStaticAccount]);

  const executeProfileWriteTx = useCallback(async (
    signerSdk: any,
    callerAddress: string,
    profileContractAddress: Encoded.ContractAddress,
    contract: any,
    functionName: string,
    args: unknown[],
  ) => {
    const FEE_SIGNING_BUFFER = 2_100_000_000_000n;
    if (!callerAddress?.startsWith('ak_')) {
      throw new Error('Invalid caller account for sponsored profile transaction');
    }
    if (!profileContractAddress?.startsWith('ct_')) {
      throw new Error('Invalid profile contract address');
    }
    const callData = encodeProfileCallData(contract, functionName, args);
    if (typeof signerSdk?.selectAccount === 'function') {
      try {
        signerSdk.selectAccount(callerAddress);
      } catch {
        // Continue; some sdk variants may not support explicit selection.
      }
    }
    let callTx: Encoded.Transaction;
    try {
      const txParams = {
        tag: Tag.ContractCallTx,
        callerId: callerAddress,
        contractId: profileContractAddress,
        amount: 0,
        gasLimit: 1_000_000,
        gasPrice: 1_500_000_000,
        ttl: (await signerSdk.getHeight({ cached: true })) + 3,
        callData,
      };
      const estimatedTx = await signerSdk.buildTx(txParams);
      const unpackedEstimated = unpackTx(
        estimatedTx,
        Tag.ContractCallTx,
      ) as any;
      const estimatedFee = BigInt(unpackedEstimated?.fee || 0);
      callTx = await signerSdk.buildTx({
        ...txParams,
        // Wallet validation can require a small headroom over minimal fee.
        fee: (estimatedFee + FEE_SIGNING_BUFFER).toString(),
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Profile tx build failed (${functionName}): ${msg}`);
    }
    let signedTxRaw: unknown;
    try {
      signedTxRaw = await signerSdk.signTransaction(callTx, {
        innerTx: true,
        onAccount: callerAddress,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Profile tx signing failed (${functionName}): ${msg}`);
    }
    const signedTx = extractSignedTx(signedTxRaw);
    if (!signedTx) {
      throw new Error(`Wallet did not return a valid signed transaction (${functionName})`);
    }
    try {
      return await payForProfileTx(signedTx, profileContractAddress);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      throw new Error(`Profile tx sponsorship failed (${functionName}): ${msg}`);
    }
  }, []);

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
      const { contract } = await initializeProfileContract(addr, { restoreSigner: false });
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
    const {
      contract,
      signerSdk,
      profileContractAddress,
    } = await initializeProfileContract(target, {
      restoreSigner: true,
      preferStaticSigner: true,
    });
    const current = await getProfileOnChain(target);
    const nextFullname = data.fullname || '';
    /** Bio is linked off-chain; preserve the on-chain profile bio field when writing. */
    const nextBio = current?.bio || '';
    const nextAvatar = data.avatarurl || '';

    let txHash: string | undefined;
    const shouldSetProfile = !current
      || current.fullname !== nextFullname
      || current.avatarurl !== nextAvatar;

    const normalizedUsername = normalizeName(data.username || '');
    const currentUsername = normalizeName(current?.username || '');
    const shouldUpdateUsername = normalizedUsername !== currentUsername
      && (normalizedUsername.length > 0 || currentUsername.length > 0);

    /** Preferred .chain name is linked off-chain; preserve on-chain chain_name when writing. */
    const shouldSetChainName = false;
    const shouldClearChainName = false;

    const shouldChangeChain = shouldSetChainName || shouldClearChainName;
    const changeCount = Number(shouldSetProfile)
      + Number(shouldUpdateUsername)
      + Number(shouldChangeChain);

    if (
      shouldSetProfile
      && !shouldUpdateUsername
      && !shouldChangeChain
    ) {
      const setProfileResult: any = await executeProfileWriteTx(
        signerSdk,
        target,
        profileContractAddress,
        contract,
        'set_profile',
        [nextFullname, nextBio, nextAvatar],
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
      const fullResult: any = await executeProfileWriteTx(
        signerSdk,
        target,
        profileContractAddress,
        contract,
        'set_profile_full',
        [
          nextFullname,
          nextBio,
          nextAvatar,
          toOption(normalizedUsername || null),
          toOption(current?.chain_name ? normalizeName(current.chain_name) : null),
          toOption(Number(current?.chain_expires_at || 0) > 0 ? Number(current.chain_expires_at) : null),
        ],
      );
      txHash = extractTxHash(fullResult) || txHash;
      return txHash;
    }

    if (shouldSetProfile) {
      const setProfileResult: any = await executeProfileWriteTx(
        signerSdk,
        target,
        profileContractAddress,
        contract,
        'set_profile',
        [nextFullname, nextBio, nextAvatar],
      );
      txHash = extractTxHash(setProfileResult);
    }

    if (shouldUpdateUsername) {
      const tx: any = await executeProfileWriteTx(
        signerSdk,
        target,
        profileContractAddress,
        contract,
        'set_custom_name',
        [normalizedUsername],
      );
      txHash = extractTxHash(tx) || txHash;
    }

    return txHash;
  }, [
    executeProfileWriteTx,
    getProfileOnChain,
    initializeProfileContract,
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
    isConfigured: Boolean(CONFIG.PROFILE_REGISTRY_CONTRACT_ADDRESS),
    getProfile,
    getProfileOnChain,
    setProfile,
    linkXWithAccessToken,
    completeXAddressLink,
    unlinkXAccount,
    linkBio,
    unlinkBio,
    linkPreferredAensName,
    unlinkPreferredAensName,
  };
}
