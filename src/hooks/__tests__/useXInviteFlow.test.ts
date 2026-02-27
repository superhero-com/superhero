import { renderHook } from '@testing-library/react';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { useXInviteFlow } from '@/hooks/useXInviteFlow';

const mockCreateXInviteChallenge = vi.fn();
const mockCreateXInvite = vi.fn();
const mockBindXInvite = vi.fn();
const mockGetXInviteProgress = vi.fn();
const mockSignMessage = vi.fn();
const mockVerifyMessage = vi.fn(() => true);

vi.mock('@aeternity/aepp-sdk', () => ({
  verifyMessage: (...args: any[]) => mockVerifyMessage(...args),
}));

vi.mock('@/api/backend', () => ({
  SuperheroApi: {
    createXInviteChallenge: (...args: any[]) => mockCreateXInviteChallenge(...args),
    createXInvite: (...args: any[]) => mockCreateXInvite(...args),
    bindXInvite: (...args: any[]) => mockBindXInvite(...args),
    getXInviteProgress: (...args: any[]) => mockGetXInviteProgress(...args),
  },
}));

vi.mock('@/hooks/useAeSdk', () => ({
  useAeSdk: () => ({
    activeAccount: 'ak_2aM8y71tVfYhMFnN2tFxzpcCGx8Y48Yxj6P8d7Vn2MUP6oQm1g',
    aeSdk: {
      signMessage: (...args: any[]) => mockSignMessage(...args),
    },
  }),
}));

describe('useXInviteFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyMessage.mockReturnValue(true);
    mockCreateXInviteChallenge.mockResolvedValue({
      nonce: 'nonce_1',
      expires_at: 123456,
      message: 'please sign this message',
    });
    mockCreateXInvite.mockResolvedValue({
      code: 'abc123',
      invite_link: 'https://api.superhero.com/invite/abc123',
    });
    mockBindXInvite.mockResolvedValue(undefined);
    mockGetXInviteProgress.mockResolvedValue({
      inviter_address: 'ak_2aM8y71tVfYhMFnN2tFxzpcCGx8Y48Yxj6P8d7Vn2MUP6oQm1g',
      verified_friends_count: 2,
      goal: 10,
      remaining_to_goal: 8,
      milestone_reward_status: 'pending',
      milestone_reward_tx_hash: null,
    });
    mockSignMessage.mockResolvedValue('0xdeadbeef');
  });

  it('generates invite link with challenge + signature flow', async () => {
    const { result } = renderHook(() => useXInviteFlow());

    const link = await result.current.generateInviteLink();

    expect(mockCreateXInviteChallenge).toHaveBeenCalledWith({
      address: 'ak_2aM8y71tVfYhMFnN2tFxzpcCGx8Y48Yxj6P8d7Vn2MUP6oQm1g',
      purpose: 'create',
    });
    expect(mockSignMessage).toHaveBeenCalledWith('please sign this message', { onAccount: 'ak_2aM8y71tVfYhMFnN2tFxzpcCGx8Y48Yxj6P8d7Vn2MUP6oQm1g' });
    expect(mockCreateXInvite).toHaveBeenCalledWith({
      inviter_address: 'ak_2aM8y71tVfYhMFnN2tFxzpcCGx8Y48Yxj6P8d7Vn2MUP6oQm1g',
      challenge_nonce: 'nonce_1',
      challenge_expires_at: '123456',
      signature_hex: 'deadbeef',
    });
    expect(link.code).toBe('abc123');
    expect(link.frontend_invite_link).toContain('?xInvite=abc123');
    expect(link.backend_invite_link).toBe('https://api.superhero.com/invite/abc123');
  });

  it('binds invite for user B with challenge + signature flow', async () => {
    const { result } = renderHook(() => useXInviteFlow());

    await result.current.bindInviteForUserB('code_bind_1', 'ak_invitee');

    expect(mockCreateXInviteChallenge).toHaveBeenCalledWith({
      address: 'ak_invitee',
      purpose: 'bind',
      code: 'code_bind_1',
    });
    expect(mockBindXInvite).toHaveBeenCalledWith('code_bind_1', {
      invitee_address: 'ak_invitee',
      challenge_nonce: 'nonce_1',
      challenge_expires_at: '123456',
      signature_hex: 'deadbeef',
    });
  });
});

