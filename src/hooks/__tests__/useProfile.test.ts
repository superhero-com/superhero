import { renderHook } from '@testing-library/react';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { useProfile } from '@/hooks/useProfile';

const mockCreateXAttestation = vi.fn();
const mockGetProfile = vi.fn();

const mockSetProfile = vi.fn();
const mockSetProfileFull = vi.fn();
const mockSetCustomName = vi.fn();
const mockSetDisplaySource = vi.fn();
const mockGetProfileOnChain = vi.fn();
const mockInitializeContract = vi.fn();
const mockAddStaticAccount = vi.fn();

let mockActiveAccount = 'ak_test_active';

vi.mock('@/api/backend', () => ({
  SuperheroApi: {
    createXAttestation: (...args: any[]) => mockCreateXAttestation(...args),
    getProfile: (...args: any[]) => mockGetProfile(...args),
  },
}));

vi.mock('@/config', () => ({
  CONFIG: {
    PROFILE_REGISTRY_CONTRACT_ADDRESS: 'ct_test_profile_registry',
  },
}));

vi.mock('@/hooks/useAeSdk', () => ({
  useAeSdk: () => ({
    activeAccount: mockActiveAccount,
    sdk: { initializeContract: (...args: any[]) => mockInitializeContract(...args) },
    staticAeSdk: null,
    addStaticAccount: (...args: any[]) => mockAddStaticAccount(...args),
  }),
}));

describe('useProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveAccount = 'ak_test_active';

    mockInitializeContract.mockResolvedValue({
      get_profile: (...args: any[]) => mockGetProfileOnChain(...args),
      set_profile: (...args: any[]) => mockSetProfile(...args),
      set_profile_full: (...args: any[]) => mockSetProfileFull(...args),
      set_custom_name: (...args: any[]) => mockSetCustomName(...args),
      set_display_source: (...args: any[]) => mockSetDisplaySource(...args),
      set_x_name_with_attestation: vi.fn(),
    });

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

    mockSetProfile.mockResolvedValue({ hash: 'th_set_profile' });
    mockSetProfileFull.mockResolvedValue({ hash: 'th_set_profile_full' });
    mockSetCustomName.mockResolvedValue({ hash: 'th_set_custom_name' });
    mockSetDisplaySource.mockResolvedValue({ hash: 'th_set_display_source' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('uses set_profile_full when multiple fields change together', async () => {
    const { result } = renderHook(() => useProfile('ak_test_active'));

    await result.current.setProfile({
      fullname: '',
      bio: '',
      avatarurl: '',
      username: '',
      displaySource: 'chain',
    });

    expect(mockSetProfileFull).toHaveBeenCalledTimes(1);
    expect(mockSetCustomName).not.toHaveBeenCalled();
    expect(mockSetDisplaySource).not.toHaveBeenCalled();
  });

  it('uses dedicated entrypoint when only display_source changes', async () => {
    const { result } = renderHook(() => useProfile('ak_test_active'));

    await result.current.setProfile({
      fullname: '',
      bio: '',
      avatarurl: '',
      username: 'old_name',
      displaySource: 'chain',
    });

    expect(mockSetProfileFull).not.toHaveBeenCalled();
    expect(mockSetDisplaySource).toHaveBeenCalledTimes(1);
    expect(mockSetDisplaySource).toHaveBeenCalledWith({ Chain: [] });
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

    await result.current.setProfile({
      fullname: 'new full',
      bio: 'new bio',
      avatarurl: 'new-avatar',
      username: 'old_name',
      displaySource: 'custom',
    });

    expect(mockSetProfile).toHaveBeenCalledTimes(1);
    expect(mockSetProfileFull).not.toHaveBeenCalled();
    expect(mockSetCustomName).not.toHaveBeenCalled();
    expect(mockSetDisplaySource).not.toHaveBeenCalled();
  });

  it('falls back to set_custom_name when set_profile_full is unavailable', async () => {
    mockInitializeContract.mockResolvedValueOnce({
      get_profile: (...args: any[]) => mockGetProfileOnChain(...args),
      set_profile: (...args: any[]) => mockSetProfile(...args),
      set_custom_name: (...args: any[]) => mockSetCustomName(...args),
      set_display_source: (...args: any[]) => mockSetDisplaySource(...args),
      set_x_name_with_attestation: vi.fn(),
    });

    const { result } = renderHook(() => useProfile('ak_test_active'));

    await result.current.setProfile({
      fullname: '',
      bio: '',
      avatarurl: '',
      username: '',
      displaySource: 'custom',
    });

    expect(mockSetCustomName).toHaveBeenCalledTimes(1);
    expect(mockSetCustomName).toHaveBeenCalledWith('');
  });

  it('does not auto-restore signer account for read-only getProfileOnChain', async () => {
    const { result } = renderHook(() => useProfile('ak_test_active'));

    await result.current.getProfileOnChain('ak_test_active');

    expect(mockAddStaticAccount).not.toHaveBeenCalled();
  });
});
