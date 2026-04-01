import { act, renderHook } from '@testing-library/react';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { useClaimChainName } from '@/hooks/useClaimChainName';

const mockCreateChainNameChallenge = vi.fn();
const mockClaimChainName = vi.fn();
const mockGetChainNameClaimStatus = vi.fn();
const mockSignMessage = vi.fn();
const mockAeSdkSignMessage = vi.fn();
const mockSelectAccount = vi.fn();
const mockGetName = vi.fn();
const mockGetNameEntryByName = vi.fn();
const mockResolveAccount = vi.fn();
const mockConnectWallet = vi.fn();
let mockWalletConnected = true;
let mockWalletInfo: Record<string, unknown> | undefined = { id: 'wallet' };
let mockConnectingWallet = false;

let mockActiveAccount = 'ak_test_active';
const mockFetch = vi.fn();
let mockAeSdkState: Record<string, unknown> | undefined;

vi.mock('@/api/backend', () => ({
  SuperheroApi: {
    createChainNameChallenge: (...args: any[]) => mockCreateChainNameChallenge(...args),
    claimChainName: (...args: any[]) => mockClaimChainName(...args),
    getChainNameClaimStatus: (...args: any[]) => mockGetChainNameClaimStatus(...args),
  },
}));

vi.mock('@/hooks/useAeSdk', () => ({
  useAeSdk: () => ({
    activeAccount: mockActiveAccount,
    sdk: {
      getName: (...args: any[]) => mockGetName(...args),
      api: {
        getNameEntryByName: (...args: any[]) => mockGetNameEntryByName(...args),
      },
    },
    staticAeSdk: null,
    aeSdk: mockAeSdkState,
  }),
}));

vi.mock('@/hooks/useWalletConnect', () => ({
  useWalletConnect: () => ({
    connectWallet: (...args: any[]) => mockConnectWallet(...args),
    connectingWallet: mockConnectingWallet,
    walletConnected: mockWalletConnected,
    walletInfo: mockWalletInfo,
  }),
}));

vi.mock('@/config', () => ({
  CONFIG: {
    NODE_URL: 'https://node.example',
    MIDDLEWARE_URL: 'https://mdw.example',
  },
}));

describe('useClaimChainName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);
    mockActiveAccount = 'ak_test_active';
    mockAeSdkState = {
      signMessage: (...args: any[]) => mockAeSdkSignMessage(...args),
      selectAccount: (...args: any[]) => mockSelectAccount(...args),
      addresses: () => [mockActiveAccount],
      _resolveAccount: (...args: any[]) => mockResolveAccount(...args),
    };
    mockSignMessage.mockResolvedValue(new Uint8Array([0xab, 0xcd]));
    mockAeSdkSignMessage.mockResolvedValue(new Uint8Array([0xab, 0xcd]));
    mockResolveAccount.mockReturnValue({
      signMessage: (...args: any[]) => mockSignMessage(...args),
    });
    mockConnectWallet.mockResolvedValue(undefined);
    mockWalletConnected = true;
    mockWalletInfo = { id: 'wallet' };
    mockConnectingWallet = false;
    mockCreateChainNameChallenge.mockResolvedValue({
      nonce: 'nonce-1',
      expires_at: '123456',
      message: 'profile_chain_name_claim:ak_test_active:nonce-1:123456',
    });
    mockGetName.mockRejectedValue(new Error('Name not found'));
    mockGetNameEntryByName.mockRejectedValue(new Error('Name not found'));
    mockClaimChainName.mockResolvedValue({ status: 'ok' });
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/v3/transactions/th_transfer')) {
        return {
          ok: true,
          json: async () => ({ block_height: 123 }),
        };
      }
      if (url.includes('/v3/names/averylongchain.chain')) {
        return {
          ok: true,
          json: async () => ({
            ownership: { current: 'ak_test_active' },
            pointers: { account_pubkey: 'ak_test_active' },
          }),
        };
      }
      return {
        ok: false,
        json: async () => ({}),
      };
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('waits for transfer confirmation and final middleware ownership before completing', async () => {
    const onStatusChange = vi.fn();
    const onSubmitted = vi.fn();
    mockGetChainNameClaimStatus
      .mockResolvedValueOnce({
        status: 'completed',
        name: 'averylongchain.chain',
        transfer_tx_hash: 'th_transfer',
        expires_at: 999999,
      })
      .mockResolvedValueOnce({
        status: 'completed',
        name: 'averylongchain.chain',
        transfer_tx_hash: 'th_transfer',
        expires_at: 999999,
      });
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ block_height: -1 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ block_height: 123 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ownership: { current: 'ak_test_active' },
          pointers: [{
            key: 'account_pubkey',
            id: 'ak_test_active',
          }],
        }),
      });
    const { result } = renderHook(() => useClaimChainName('ak_test_active'));

    let response: any;
    await act(async () => {
      response = await result.current.claimSponsoredChainName({
        name: 'averylongchain',
        onSubmitted,
        onStatusChange,
        pollIntervalMs: 0,
      });
    });

    expect(mockCreateChainNameChallenge).toHaveBeenCalledWith('ak_test_active');
    expect(mockSelectAccount).toHaveBeenCalledWith('ak_test_active');
    expect(mockAeSdkSignMessage).toHaveBeenCalledWith(
      'profile_chain_name_claim:ak_test_active:nonce-1:123456',
      { onAccount: 'ak_test_active' },
    );
    expect(mockClaimChainName).toHaveBeenCalledWith({
      address: 'ak_test_active',
      name: 'averylongchain',
      challenge_nonce: 'nonce-1',
      challenge_expires_at: '123456',
      signature_hex: 'abcd',
    });
    expect(onSubmitted).toHaveBeenCalledWith(expect.objectContaining({ status: 'ok' }));
    expect(onStatusChange).toHaveBeenCalledWith(expect.objectContaining({ status: 'ok' }));
    expect(onStatusChange).toHaveBeenCalledWith(expect.objectContaining({ status: 'queued' }));
    expect(onStatusChange).toHaveBeenCalledWith(expect.objectContaining({ status: 'transfer_pending' }));
    expect(onStatusChange).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }));
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/v3/transactions/th_transfer'),
      expect.any(Object),
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/v3/names/averylongchain.chain'),
      expect.any(Object),
    );
    expect(response).toMatchObject({
      status: 'completed',
      name: 'averylongchain.chain',
      expiresAt: 999999,
    });
  });

  it('surfaces backend chain name claim failures', async () => {
    mockFetch.mockReset();
    mockGetChainNameClaimStatus.mockResolvedValueOnce({
      status: 'failed',
      error: 'Name is already taken',
    });
    const { result } = renderHook(() => useClaimChainName('ak_test_active'));

    await act(async () => {
      await expect(result.current.claimSponsoredChainName({
        name: 'averylongchain',
        pollIntervalMs: 0,
      })).rejects.toThrow('Name is already taken');
    });
  });

  it('checks whether a name is already present on chain', async () => {
    mockGetName.mockResolvedValueOnce({ status: 'claimed' });
    const { result } = renderHook(() => useClaimChainName('ak_test_active'));

    await expect(result.current.checkNameAvailability('taken-name')).resolves.toBe(false);
    await expect(result.current.checkNameAvailability('available-name')).resolves.toBe(true);
  });

  it('falls back to the node name lookup when sdk.getName is unavailable', async () => {
    mockGetName.mockImplementation(() => {
      throw new Error('getName unavailable');
    });
    mockGetNameEntryByName
      .mockResolvedValueOnce({ id: 'nm_taken' })
      .mockRejectedValueOnce(new Error('404 not found'));
    const { result } = renderHook(() => useClaimChainName('ak_test_active'));

    await expect(result.current.checkNameAvailability('taken-name')).resolves.toBe(false);
    await expect(result.current.checkNameAvailability('available-name')).resolves.toBe(true);
  });

  it('rejects claims when the wallet signer account is unavailable', async () => {
    mockAeSdkSignMessage.mockRejectedValueOnce(new Error('Wallet message signing is not available'));
    mockResolveAccount.mockReturnValueOnce(null);
    const { result } = renderHook(() => useClaimChainName('ak_test_active'));

    await act(async () => {
      await expect(result.current.claimSponsoredChainName({
        name: 'averylongchain',
        pollIntervalMs: 0,
      })).rejects.toThrow('Wallet message signing is not available');
    });
  });

  it('does not retry signing through the fallback signer after user rejection', async () => {
    mockAeSdkSignMessage.mockRejectedValueOnce(new Error('Rejected by user'));
    const { result } = renderHook(() => useClaimChainName('ak_test_active'));

    await act(async () => {
      await expect(result.current.claimSponsoredChainName({
        name: 'averylongchain',
        pollIntervalMs: 0,
      })).rejects.toThrow('Rejected by user');
    });

    expect(mockResolveAccount).not.toHaveBeenCalled();
    expect(mockSignMessage).not.toHaveBeenCalled();
  });

  it('falls back to an authorized wallet signer when direct sdk signing is unavailable', async () => {
    mockAeSdkSignMessage.mockRejectedValueOnce(new Error('sdk sign failed'));
    mockGetChainNameClaimStatus.mockResolvedValueOnce({
      status: 'completed',
      name: 'averylongchain.chain',
      transfer_tx_hash: 'th_transfer',
      expires_at: 999999,
    });
    const { result } = renderHook(() => useClaimChainName('ak_test_active'));

    await act(async () => {
      await expect(result.current.claimSponsoredChainName({
        name: 'averylongchain',
        pollIntervalMs: 0,
      })).resolves.toMatchObject({
        status: 'completed',
        name: 'averylongchain.chain',
      });
    });

    expect(mockResolveAccount).toHaveBeenCalledWith('ak_test_active');
    expect(mockSignMessage).toHaveBeenCalledWith('profile_chain_name_claim:ak_test_active:nonce-1:123456');
  });

  it('keeps claiming enabled for the connected profile address', () => {
    const { result } = renderHook(() => useClaimChainName('ak_test_active'));
    expect(result.current.canClaim).toBe(true);
  });

  it('does not crash when aeSdk.address throws before wallet reconnect', () => {
    mockActiveAccount = undefined as any;
    mockAeSdkState = {
      signMessage: (...args: any[]) => mockAeSdkSignMessage(...args),
      selectAccount: (...args: any[]) => mockSelectAccount(...args),
      addresses: () => [],
      _resolveAccount: (...args: any[]) => mockResolveAccount(...args),
    };
    Object.defineProperty(mockAeSdkState, 'address', {
      get() {
        throw new Error('You are not connected to Wallet');
      },
    });

    expect(() => renderHook(() => useClaimChainName('ak_test_active'))).not.toThrow();
  });

  it('reconnects the extension before signing when wallet session is stale', async () => {
    mockWalletConnected = false;
    mockConnectWallet.mockImplementation(async () => {
      mockWalletConnected = true;
    });
    mockGetChainNameClaimStatus.mockResolvedValueOnce({
      status: 'completed',
      name: 'averylongchain.chain',
      transfer_tx_hash: 'th_transfer',
      expires_at: 999999,
    });
    const { result } = renderHook(() => useClaimChainName('ak_test_active'));

    await act(async () => {
      await expect(result.current.claimSponsoredChainName({
        name: 'averylongchain',
        pollIntervalMs: 0,
      })).resolves.toMatchObject({
        status: 'completed',
        name: 'averylongchain.chain',
      });
    });

    expect(mockConnectWallet).toHaveBeenCalled();
  });

  it('accepts final middleware ownership even when pointers are omitted', async () => {
    mockGetChainNameClaimStatus.mockResolvedValueOnce({
      status: 'completed',
      name: 'averylongchain.chain',
      transfer_tx_hash: 'th_transfer',
      expires_at: 999999,
    });
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ block_height: 123 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ownership: { current: 'ak_test_active' },
        }),
      });
    const { result } = renderHook(() => useClaimChainName('ak_test_active'));

    await act(async () => {
      await expect(result.current.claimSponsoredChainName({
        name: 'averylongchain',
        pollIntervalMs: 0,
      })).resolves.toMatchObject({
        status: 'completed',
        name: 'averylongchain.chain',
      });
    });
  });
});
