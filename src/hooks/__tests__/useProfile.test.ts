import { act, renderHook } from '@testing-library/react';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { useProfile } from '@/hooks/useProfile';

const mockCreateXAttestation = vi.fn();
const mockGetProfile = vi.fn();
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
    createXAttestation: (...args: any[]) => mockCreateXAttestation(...args),
    getProfile: (...args: any[]) => mockGetProfile(...args),
  },
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
        { Custom: [] },
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
      ['new full', 'new bio', 'new-avatar'],
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

  it('does not auto-restore signer account for read-only getProfileOnChain', async () => {
    const { result } = renderHook(() => useProfile('ak_test_active'));

    await act(async () => {
      await result.current.getProfileOnChain('ak_test_active');
    });

    expect(mockAddStaticAccount).not.toHaveBeenCalled();
  });
});
