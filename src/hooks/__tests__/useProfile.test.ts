import { act, renderHook } from '@testing-library/react';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { useProfile } from '@/hooks/useProfile';

const mockClaimXAddressLink = vi.fn();
const mockClaimBioAddressLink = vi.fn();
const mockSubmitBioAddressLink = vi.fn();
const mockUnclaimBioAddressLink = vi.fn();
const mockSubmitBioAddressLinkUnclaim = vi.fn();
const mockGetProfile = vi.fn();
const mockSignAndVerifyLinkMessage = vi.fn();
const mockInitializeContractTyped = vi.fn();
const mockPayForProfileTx = vi.fn();
const mockAddStaticAccount = vi.fn();
const mockBuildTx = vi.fn();
const mockGetHeight = vi.fn();
const mockSelectAccount = vi.fn();
const mockSignTransaction = vi.fn();
const mockCalldataEncode = vi.fn();
const mockGetProfileOnChain = vi.fn();

let mockActiveAccount = 'ak_test_active';
let mockContract: any;

vi.mock('@aeternity/aepp-sdk', async () => {
  const actual = await vi.importActual<any>('@aeternity/aepp-sdk');
  return {
    ...actual,
    unpackTx: vi.fn(() => ({ fee: '1000' })),
  };
});

vi.mock('@/api/backend', () => ({
  SuperheroApi: {
    claimXAddressLink: (...args: any[]) => mockClaimXAddressLink(...args),
    claimBioAddressLink: (...args: any[]) => mockClaimBioAddressLink(...args),
    submitBioAddressLink: (...args: any[]) => mockSubmitBioAddressLink(...args),
    unclaimBioAddressLink: (...args: any[]) => mockUnclaimBioAddressLink(...args),
    submitBioAddressLinkUnclaim: (...args: any[]) => mockSubmitBioAddressLinkUnclaim(...args),
    getProfile: (...args: any[]) => mockGetProfile(...args),
  },
}));

vi.mock('@/utils/signLinkMessage', () => ({
  signAndVerifyLinkMessage: (...args: any[]) => mockSignAndVerifyLinkMessage(...args),
}));

vi.mock('@/libs/initializeContractTyped', () => ({
  initializeContractTyped: (...args: any[]) => mockInitializeContractTyped(...args),
}));

vi.mock('@/config', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/config')>();
  return {
    ...mod,
    CONFIG: {
      ...mod.CONFIG,
      PROFILE_REGISTRY_CONTRACT_ADDRESS: 'ct_test_profile_registry',
    },
  };
});

vi.mock('@/services/payForProfileTx', async () => {
  const actual = await vi.importActual<any>('@/services/payForProfileTx');
  return {
    ...actual,
    payForProfileTx: (...args: any[]) => mockPayForProfileTx(...args),
  };
});

vi.mock('@/hooks/useAeSdk', () => ({
  useAeSdk: () => ({
    activeAccount: mockActiveAccount,
    sdk: {
      _accounts: { current: { [mockActiveAccount]: {} } },
      getContext: () => ({}),
      getHeight: (...args: any[]) => mockGetHeight(...args),
      buildTx: (...args: any[]) => mockBuildTx(...args),
      signTransaction: (...args: any[]) => mockSignTransaction(...args),
      selectAccount: (...args: any[]) => mockSelectAccount(...args),
    },
    staticAeSdk: {
      _accounts: { current: { [mockActiveAccount]: {} } },
      getContext: () => ({}),
      getHeight: (...args: any[]) => mockGetHeight(...args),
      buildTx: (...args: any[]) => mockBuildTx(...args),
      signTransaction: (...args: any[]) => mockSignTransaction(...args),
      selectAccount: (...args: any[]) => mockSelectAccount(...args),
    },
    addStaticAccount: (...args: any[]) => mockAddStaticAccount(...args),
    signMessage: vi.fn(),
  }),
}));

vi.mock('@/hooks/useWalletConnect', () => ({
  useWalletConnect: () => ({
    connectWallet: vi.fn(),
    walletConnected: true,
  }),
}));

describe('useProfile', () => {
  let buildTxCall = 0;

  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveAccount = 'ak_test_active';
    buildTxCall = 0;

    mockContract = {
      _calldata: {
        encode: (...args: any[]) => mockCalldataEncode(...args),
      },
      get_profile: (...args: any[]) => mockGetProfileOnChain(...args),
      set_profile: vi.fn(),
      set_profile_full: vi.fn(),
      set_custom_name: vi.fn(),
      set_chain_name: vi.fn(),
      clear_chain_name: vi.fn(),
      set_x_name_with_attestation: vi.fn(),
    };

    mockInitializeContractTyped.mockResolvedValue(mockContract);
    mockCalldataEncode.mockImplementation((_contractName: string, functionName: string) => (
      `cb_${functionName}` as any
    ));

    mockGetProfileOnChain.mockResolvedValue({
      decodedResult: {
        Some: [{
          fullname: '',
          bio: '',
          avatarurl: '',
          username: 'old_name',
          display_source: { Custom: [] },
        }],
      },
    });

    mockAddStaticAccount.mockResolvedValue(undefined);
    mockGetHeight.mockResolvedValue(100);
    mockBuildTx.mockImplementation(async (params: Record<string, unknown>) => {
      buildTxCall += 1;
      return `tx_built_${buildTxCall}_${String(params.callData ?? 'unknown')}`;
    });
    mockSignTransaction.mockResolvedValue({ tx: 'tx_signed_profile' });
    mockPayForProfileTx.mockImplementation(async () => ({ hash: 'th_profile_write' }));
    mockSignAndVerifyLinkMessage.mockResolvedValue('sig_bio_test');
    mockClaimBioAddressLink.mockResolvedValue({
      message: 'sign me',
      nonce: 1,
      value: 'my bio',
      verification_token: 'token_bio',
    });
    mockSubmitBioAddressLink.mockResolvedValue({ txHash: 'th_bio_link' });
    mockUnclaimBioAddressLink.mockResolvedValue({ message: 'unclaim me', nonce: 2 });
    mockSubmitBioAddressLinkUnclaim.mockResolvedValue({ txHash: 'th_bio_unlink' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('uses set_profile_full when multiple fields change together', async () => {
    const { result } = renderHook(() => useProfile('ak_test_active'));

    await act(async () => {
      await result.current.setProfile({
        fullname: 'new full',
        bio: '',
        avatarurl: '',
        username: '',
      });
    });

    expect(mockCalldataEncode).toHaveBeenCalledWith(
      'ProfileRegistry',
      'set_profile_full',
      [
        'new full',
        '',
        '',
        { None: [] },
        { None: [] },
        { None: [] },
      ],
    );
    expect(mockPayForProfileTx).toHaveBeenCalledTimes(1);
  });

  it('uses dedicated entrypoint when only username changes', async () => {
    const { result } = renderHook(() => useProfile('ak_test_active'));

    await act(async () => {
      await result.current.setProfile({
        fullname: '',
        bio: '',
        avatarurl: '',
        username: 'new_name',
      });
    });

    expect(mockCalldataEncode).toHaveBeenCalledWith(
      'ProfileRegistry',
      'set_custom_name',
      ['new_name'],
    );
    expect(mockPayForProfileTx).toHaveBeenCalledTimes(1);
  });

  it('uses set_profile only when changing base profile fields', async () => {
    mockGetProfileOnChain.mockResolvedValueOnce({
      decodedResult: {
        Some: [{
          fullname: 'old full',
          bio: 'old bio',
          avatarurl: 'old-avatar',
          username: 'old_name',
          display_source: { Custom: [] },
        }],
      },
    });

    const { result } = renderHook(() => useProfile('ak_test_active'));

    await act(async () => {
      await result.current.setProfile({
        fullname: 'new full',
        bio: 'new bio',
        avatarurl: 'new-avatar',
        username: 'old_name',
      });
    });

    expect(mockCalldataEncode).toHaveBeenCalledWith(
      'ProfileRegistry',
      'set_profile',
      ['new full', 'old bio', 'new-avatar'],
    );
    expect(mockCalldataEncode).not.toHaveBeenCalledWith(
      'ProfileRegistry',
      'set_profile_full',
      expect.any(Array),
    );
  });

  it('falls back to dedicated entrypoints when set_profile_full is unavailable', async () => {
    delete mockContract.set_profile_full;

    const { result } = renderHook(() => useProfile('ak_test_active'));

    await act(async () => {
      await result.current.setProfile({
        fullname: 'new full',
        bio: '',
        avatarurl: '',
        username: 'new_name',
      });
    });

    expect(mockCalldataEncode).toHaveBeenNthCalledWith(
      1,
      'ProfileRegistry',
      'set_profile',
      ['new full', '', ''],
    );
    expect(mockCalldataEncode).toHaveBeenNthCalledWith(
      2,
      'ProfileRegistry',
      'set_custom_name',
      ['new_name'],
    );
    expect(mockPayForProfileTx).toHaveBeenCalledTimes(2);
  });

  it('does not submit a tx when nothing changed', async () => {
    mockGetProfileOnChain.mockResolvedValueOnce({
      decodedResult: {
        Some: [{
          fullname: '',
          bio: '',
          avatarurl: '',
          username: '',
          display_source: { Custom: [] },
        }],
      },
    });

    const { result } = renderHook(() => useProfile('ak_test_active'));

    await act(async () => {
      await expect(result.current.setProfile({
        fullname: '',
        bio: '',
        avatarurl: '',
        username: '',
      })).resolves.toBeUndefined();
    });

    expect(mockCalldataEncode).not.toHaveBeenCalled();
    expect(mockPayForProfileTx).not.toHaveBeenCalled();
  });

  it('links bio via address-link claim and submit', async () => {
    const { result } = renderHook(() => useProfile('ak_test_active'));

    await act(async () => {
      const txHash = await result.current.linkBio({ bio: 'hello bio' });
      expect(txHash).toBe('th_bio_link');
    });

    expect(mockClaimBioAddressLink).toHaveBeenCalledWith('ak_test_active', 'hello bio');
    expect(mockSubmitBioAddressLink).toHaveBeenCalledWith({
      address: 'ak_test_active',
      value: 'my bio',
      nonce: 1,
      signature: 'sig_bio_test',
      verification_token: 'token_bio',
    });
  });

  it('unlinks bio via address-link unclaim flow', async () => {
    const { result } = renderHook(() => useProfile('ak_test_active'));

    await act(async () => {
      const txHash = await result.current.unlinkBio();
      expect(txHash).toBe('th_bio_unlink');
    });

    expect(mockUnclaimBioAddressLink).toHaveBeenCalledWith('ak_test_active');
    expect(mockSubmitBioAddressLinkUnclaim).toHaveBeenCalledWith({
      address: 'ak_test_active',
      nonce: 2,
      signature: 'sig_bio_test',
    });
  });

  it('does not auto-restore signer account for read-only getProfileOnChain', async () => {
    const { result } = renderHook(() => useProfile('ak_test_active'));

    await act(async () => {
      await result.current.getProfileOnChain('ak_test_active');
    });

    expect(mockAddStaticAccount).not.toHaveBeenCalled();
  });
});
