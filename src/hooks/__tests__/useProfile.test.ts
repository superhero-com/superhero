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
const mockClaimPreferredAensNameAddressLink = vi.fn();
const mockSubmitPreferredAensNameAddressLink = vi.fn();
const mockUnclaimPreferredAensNameAddressLink = vi.fn();
const mockSubmitPreferredAensNameAddressLinkUnclaim = vi.fn();
const mockGetProfile = vi.fn();
const mockIssueProfileChallenge = vi.fn();
const mockUpdateProfile = vi.fn();
const mockSignAndVerifyLinkMessage = vi.fn();
const mockAddStaticAccount = vi.fn();
const mockI18nT = vi.fn((key: string) => `translated:${key}`);

let mockActiveAccount = 'ak_test_active';

vi.mock('@/api/backend', () => ({
  SuperheroApi: {
    claimXAddressLink: (...args: any[]) => mockClaimXAddressLink(...args),
    claimBioAddressLink: (...args: any[]) => mockClaimBioAddressLink(...args),
    submitBioAddressLink: (...args: any[]) => mockSubmitBioAddressLink(...args),
    unclaimBioAddressLink: (...args: any[]) => mockUnclaimBioAddressLink(...args),
    submitBioAddressLinkUnclaim: (...args: any[]) => mockSubmitBioAddressLinkUnclaim(...args),
    claimPreferredAensNameAddressLink: (...args: any[]) => mockClaimPreferredAensNameAddressLink(...args),
    submitPreferredAensNameAddressLink: (...args: any[]) => mockSubmitPreferredAensNameAddressLink(...args),
    unclaimPreferredAensNameAddressLink: (...args: any[]) => mockUnclaimPreferredAensNameAddressLink(...args),
    submitPreferredAensNameAddressLinkUnclaim: (...args: any[]) => mockSubmitPreferredAensNameAddressLinkUnclaim(...args),
    getProfile: (...args: any[]) => mockGetProfile(...args),
    issueProfileChallenge: (...args: any[]) => mockIssueProfileChallenge(...args),
    updateProfile: (...args: any[]) => mockUpdateProfile(...args),
  },
}));

vi.mock('@/utils/signLinkMessage', () => ({
  signAndVerifyLinkMessage: (...args: any[]) => mockSignAndVerifyLinkMessage(...args),
}));

vi.mock('@/i18n', () => ({
  default: {
    t: (...args: any[]) => mockI18nT(...args),
  },
}));

vi.mock('@/hooks/useAeSdk', () => ({
  useAeSdk: () => ({
    activeAccount: mockActiveAccount,
    sdk: {
      _accounts: { current: { [mockActiveAccount]: {} } },
      getContext: () => ({}),
    },
    staticAeSdk: {
      _accounts: { current: { [mockActiveAccount]: {} } },
      getContext: () => ({}),
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

const emptyProfileAggregate = () => ({
  address: 'ak_test_active',
  public_name: null,
  profile: {
    fullname: '',
    bio: '',
    avatarurl: '',
    username: null,
    x_username: null,
    chain_name: null,
    display_source: null,
    chain_expires_at: null,
  },
});

describe('useProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveAccount = 'ak_test_active';
    mockI18nT.mockImplementation((key: string) => `translated:${key}`);
    mockGetProfile.mockResolvedValue(emptyProfileAggregate());
    mockIssueProfileChallenge.mockResolvedValue({
      challenge: 'profile-challenge',
      payload_hash: 'hash',
      expires_at: '2099-01-01T00:00:00Z',
      ttl_seconds: 300,
    });
    mockUpdateProfile.mockResolvedValue({ address: 'ak_test_active' });
    mockAddStaticAccount.mockResolvedValue(undefined);
    mockSignAndVerifyLinkMessage.mockResolvedValue('sig_profile_test');
    mockClaimBioAddressLink.mockResolvedValue({
      message: 'sign me',
      nonce: 1,
      value: 'my bio',
      verification_token: 'token_bio',
    });
    mockSubmitBioAddressLink.mockResolvedValue({ txHash: 'th_bio_link' });
    mockUnclaimBioAddressLink.mockResolvedValue({ message: 'unclaim me', nonce: 2 });
    mockSubmitBioAddressLinkUnclaim.mockResolvedValue({ txHash: 'th_bio_unlink' });
    mockClaimPreferredAensNameAddressLink.mockResolvedValue({
      message: 'sign preferred name',
      nonce: 3,
      value: 'hero.chain',
      verification_token: 'token_pref',
    });
    mockSubmitPreferredAensNameAddressLink.mockResolvedValue({ txHash: 'th_pref_link' });
    mockUnclaimPreferredAensNameAddressLink.mockResolvedValue({ message: 'unclaim pref', nonce: 4 });
    mockSubmitPreferredAensNameAddressLinkUnclaim.mockResolvedValue({ txHash: 'th_pref_unlink' });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('updates profile via signed PATCH when avatar changes', async () => {
    mockGetProfile.mockResolvedValue({
      ...emptyProfileAggregate(),
      profile: {
        ...emptyProfileAggregate().profile,
        fullname: 'Name',
        avatarurl: 'https://old.test/a.png',
        username: 'old_name',
      },
    });

    const { result } = renderHook(() => useProfile('ak_test_active'));

    await act(async () => {
      await result.current.setProfile({
        fullname: 'Name',
        bio: '',
        avatarurl: 'https://new.test/a.png',
        username: 'old_name',
      });
    });

    expect(mockIssueProfileChallenge).toHaveBeenCalledWith('ak_test_active', {
      avatarurl: 'https://new.test/a.png',
    });
    expect(mockSignAndVerifyLinkMessage).toHaveBeenCalledWith(
      'ak_test_active',
      expect.any(Function),
      'profile-challenge',
      expect.objectContaining({ request: expect.objectContaining({ type: 'profile-update' }) }),
    );
    expect(mockUpdateProfile).toHaveBeenCalledWith('ak_test_active', {
      avatarurl: 'https://new.test/a.png',
      challenge: 'profile-challenge',
      signature: 'sig_profile_test',
    });
  });

  it('updates username via signed PATCH when only username changes', async () => {
    mockGetProfile.mockResolvedValue({
      ...emptyProfileAggregate(),
      profile: {
        ...emptyProfileAggregate().profile,
        username: 'old_name',
      },
    });

    const { result } = renderHook(() => useProfile('ak_test_active'));

    await act(async () => {
      await result.current.setProfile({
        fullname: '',
        bio: '',
        avatarurl: '',
        username: 'new_name',
      });
    });

    expect(mockIssueProfileChallenge).toHaveBeenCalledWith('ak_test_active', {
      username: 'new_name',
    });
    expect(mockUpdateProfile).toHaveBeenCalledTimes(1);
  });

  it('does not call profile PATCH when nothing changed', async () => {
    const { result } = renderHook(() => useProfile('ak_test_active'));

    await act(async () => {
      await expect(result.current.setProfile({
        fullname: '',
        bio: '',
        avatarurl: '',
        username: '',
      })).resolves.toBeUndefined();
    });

    expect(mockIssueProfileChallenge).not.toHaveBeenCalled();
    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });

  it('uses translated errors for missing X verification addresses', async () => {
    const { result } = renderHook(() => useProfile());

    await act(async () => {
      await expect(result.current.completeXAddressLink({
        message: 'sign me',
        nonce: 1,
        value: 'value',
        verification_token: 'token',
      })).rejects.toThrow('translated:common.messages.missingAddressForXVerification');
    });

    expect(mockI18nT).toHaveBeenCalledWith('common.messages.missingAddressForXVerification');
  });

  it('uses translated errors for missing X OAuth tokens', async () => {
    const { result } = renderHook(() => useProfile('ak_test_active'));

    await act(async () => {
      await expect(result.current.linkXWithAccessToken({ accessToken: '   ' })).rejects.toThrow('translated:common.messages.missingXOAuthToken');
    });

    expect(mockI18nT).toHaveBeenCalledWith('common.messages.missingXOAuthToken');
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
      signature: 'sig_profile_test',
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
      signature: 'sig_profile_test',
    });
  });

  it('links preferred aens name via address-link claim and submit', async () => {
    const { result } = renderHook(() => useProfile('ak_test_active'));

    await act(async () => {
      const txHash = await result.current.linkPreferredAensName({ chainName: 'hero.chain' });
      expect(txHash).toBe('th_pref_link');
    });

    expect(mockClaimPreferredAensNameAddressLink).toHaveBeenCalledWith('ak_test_active', 'hero.chain');
    expect(mockSubmitPreferredAensNameAddressLink).toHaveBeenCalledWith({
      address: 'ak_test_active',
      value: 'hero.chain',
      nonce: 3,
      signature: 'sig_profile_test',
      verification_token: 'token_pref',
    });
  });

  it('unlinks preferred aens name via address-link unclaim flow', async () => {
    const { result } = renderHook(() => useProfile('ak_test_active'));

    await act(async () => {
      const txHash = await result.current.unlinkPreferredAensName();
      expect(txHash).toBe('th_pref_unlink');
    });

    expect(mockUnclaimPreferredAensNameAddressLink).toHaveBeenCalledWith('ak_test_active');
    expect(mockSubmitPreferredAensNameAddressLinkUnclaim).toHaveBeenCalledWith({
      address: 'ak_test_active',
      nonce: 4,
      signature: 'sig_profile_test',
    });
  });

  it('loads profile fields from API for getProfileOnChain', async () => {
    mockGetProfile.mockResolvedValue({
      address: 'ak_test_active',
      public_name: null,
      profile: {
        fullname: 'On API',
        bio: 'bio text',
        avatarurl: 'https://avatar.test/x.png',
        username: 'user1',
        x_username: null,
        chain_name: null,
        display_source: null,
        chain_expires_at: null,
      },
    });

    const { result } = renderHook(() => useProfile('ak_test_active'));

    let profile: Awaited<ReturnType<typeof result.current.getProfileOnChain>> | undefined;
    await act(async () => {
      profile = await result.current.getProfileOnChain('ak_test_active');
    });

    expect(mockGetProfile).toHaveBeenCalledWith('ak_test_active');
    expect(mockAddStaticAccount).not.toHaveBeenCalled();
    expect(profile).toMatchObject({
      fullname: 'On API',
      bio: 'bio text',
      avatarurl: 'https://avatar.test/x.png',
      username: 'user1',
    });
  });
});
