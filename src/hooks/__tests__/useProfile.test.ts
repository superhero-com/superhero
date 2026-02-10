import { renderHook } from '@testing-library/react';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { useProfile } from '@/hooks/useProfile';

const mockCreateXAttestation = vi.fn();
const mockGetProfile = vi.fn();

const mockSetProfile = vi.fn();
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
    mockSetCustomName.mockResolvedValue({ hash: 'th_set_custom_name' });
    mockSetDisplaySource.mockResolvedValue({ hash: 'th_set_display_source' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('clears username on-chain when user removes existing custom name', async () => {
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
});
