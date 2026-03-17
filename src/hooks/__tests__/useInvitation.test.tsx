import { act, renderHook, waitFor } from '@testing-library/react';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

const mockNavigate = vi.fn();
const mockRegisterInvitationCode = vi.fn();
const mockGetAffiliationTreasury = vi.fn();
const mockGenerateAccount = vi.fn();

let mockLocation = { hash: '' };
let mockActiveAccount = 'ak_inviter';

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
}));

vi.mock('../useAccount', () => ({
  useAccount: () => ({ activeAccount: mockActiveAccount }),
}));

vi.mock('../useCommunityFactory', () => ({
  useCommunityFactory: () => ({
    getAffiliationTreasury: mockGetAffiliationTreasury,
  }),
}));

vi.mock('@aeternity/aepp-sdk', async () => {
  const actual = await vi.importActual<any>('@aeternity/aepp-sdk');
  return {
    ...actual,
    MemoryAccount: {
      ...actual.MemoryAccount,
      generate: (...args: any[]) => mockGenerateAccount(...args),
    },
  };
});

describe('useInvitation', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    mockLocation = { hash: '' };
    mockActiveAccount = 'ak_inviter';

    localStorage.clear();

    mockGetAffiliationTreasury.mockResolvedValue({
      registerInvitationCode: mockRegisterInvitationCode,
    });

    mockGenerateAccount
      .mockReturnValueOnce({
        address: 'ak_invitee_one',
        secretKey: 'sk_one',
      })
      .mockReturnValueOnce({
        address: 'ak_invitee_two',
        secretKey: 'sk_two',
      });
  });

  it('registers generated invite keys and stores them locally', async () => {
    const { useInvitation } = await import('../useInvitation');
    const { result } = renderHook(() => useInvitation());

    await act(async () => {
      await expect(result.current.generateInviteKeys(2, 2)).resolves.toEqual(['sk_one', 'sk_two']);
    });

    expect(mockRegisterInvitationCode).toHaveBeenCalledWith(
      ['ak_invitee_one', 'ak_invitee_two'],
      10n ** 15n,
      2000000000000000000n,
    );

    const stored = JSON.parse(localStorage.getItem('invite_list') || '[]');
    expect(stored).toEqual([
      expect.objectContaining({
        inviter: 'ak_inviter',
        invitee: 'ak_invitee_two',
        secretKey: 'sk_two',
        amount: 2,
      }),
      expect.objectContaining({
        inviter: 'ak_inviter',
        invitee: 'ak_invitee_one',
        secretKey: 'sk_one',
        amount: 2,
      }),
    ]);

    await waitFor(() => {
      expect(result.current.activeAccountInviteList).toHaveLength(2);
    });
  });

  it('reads invite codes from the URL hash and resets them cleanly', async () => {
    mockLocation = { hash: '#invite_code=secret-123' };

    const { useInvitation } = await import('../useInvitation');
    const { result } = renderHook(() => useInvitation());

    await waitFor(() => {
      expect(result.current.invitationCode).toBe('secret-123');
    });

    expect(localStorage.getItem('invite_code')).toBe('secret-123');
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });

    act(() => {
      result.current.resetInviteCode();
    });

    expect(result.current.invitationCode).toBeUndefined();
    expect(localStorage.getItem('invite_code')).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith({ hash: '' });
  });
});
