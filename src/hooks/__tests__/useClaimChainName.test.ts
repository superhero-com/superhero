import { act, renderHook } from '@testing-library/react';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { useClaimChainName } from '@/hooks/useClaimChainName';
import * as apiRead from '@/utils/apiRead';

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

  it('disables claim when connected wallet does not match profile address', () => {
    mockActiveAccount = 'ak_other_wallet';
    const { result } = renderHook(() => useClaimChainName('ak_test_active'));

    expect(result.current.canClaim).toBe(false);
    expect(result.current.claimAddress).toBe('ak_test_active');
    expect(result.current.connectedAddress).toBe('ak_other_wallet');
  });

  it('rejects claim when wallet address mismatches target profile', async () => {
    mockActiveAccount = 'ak_other_wallet';
    mockWalletConnected = false;
    mockWalletInfo = undefined;
    const { result } = renderHook(() => useClaimChainName('ak_test_active'));

    await act(async () => {
      await expect(result.current.claimSponsoredChainName({
        name: 'averylongchain',
        pollIntervalMs: 0,
      })).rejects.toThrow('Connect the wallet for this profile to claim a .chain name');
    });

    expect(mockCreateChainNameChallenge).not.toHaveBeenCalled();
  });

  it('normalizes .chain suffix and casing before submitting claim', async () => {
    mockGetChainNameClaimStatus.mockResolvedValueOnce({
      status: 'completed',
      name: 'averylongchain.chain',
      transfer_tx_hash: 'th_transfer',
      expires_at: 999999,
    });
    const { result } = renderHook(() => useClaimChainName('ak_test_active'));

    await act(async () => {
      await result.current.claimSponsoredChainName({
        name: '  AveryLongChain.CHAIN  ',
        pollIntervalMs: 0,
      });
    });

    expect(mockClaimChainName).toHaveBeenCalledWith(expect.objectContaining({
      name: 'averylongchain',
    }));
  });

  it('normalizes 0x-prefixed wallet signatures', async () => {
    mockAeSdkSignMessage.mockResolvedValueOnce('0xAbCd');
    mockGetChainNameClaimStatus.mockResolvedValueOnce({
      status: 'completed',
      name: 'averylongchain.chain',
      transfer_tx_hash: 'th_transfer',
      expires_at: 999999,
    });
    const { result } = renderHook(() => useClaimChainName('ak_test_active'));

    await act(async () => {
      await result.current.claimSponsoredChainName({
        name: 'averylongchain',
        pollIntervalMs: 0,
      });
    });

    expect(mockClaimChainName).toHaveBeenCalledWith(expect.objectContaining({
      signature_hex: 'abcd',
    }));
  });

  it('reads expiry from alternate backend field names', async () => {
    mockGetChainNameClaimStatus.mockResolvedValueOnce({
      status: 'completed',
      name: 'averylongchain.chain',
      transfer_tx_hash: 'th_transfer',
      approximateExpireTime: 424242,
    });
    const { result } = renderHook(() => useClaimChainName('ak_test_active'));

    let response: any;
    await act(async () => {
      response = await result.current.claimSponsoredChainName({
        name: 'averylongchain',
        pollIntervalMs: 0,
      });
    });

    expect(response.expiresAt).toBe(424242);
  });

  it('throws when availability cannot be verified', async () => {
    mockGetName.mockResolvedValue(null);
    mockGetNameEntryByName.mockResolvedValue(null);
    const fetchNameRecordSpy = vi.spyOn(apiRead, 'fetchNameRecord')
      .mockRejectedValue(new Error('upstream timeout'));
    const { result } = renderHook(() => useClaimChainName('ak_test_active'));

    await expect(result.current.checkNameAvailability('averylongchain')).rejects.toThrow(
      'Unable to verify chain name availability right now',
    );
    fetchNameRecordSpy.mockRestore();
  });

  it('treats silent node misses as available when sdk lookups are empty', async () => {
    mockGetName.mockResolvedValue(null);
    mockGetNameEntryByName.mockResolvedValue(null);
    const fetchNameRecordSpy = vi.spyOn(apiRead, 'fetchNameRecord').mockResolvedValue(null);
    const { result } = renderHook(() => useClaimChainName('ak_test_active'));

    await expect(result.current.checkNameAvailability('averylongchain')).resolves.toBe(true);
    fetchNameRecordSpy.mockRestore();
  });

  it('reports preclaim_pending while preclaim transaction is unmined', async () => {
    const onStatusChange = vi.fn();
    mockGetChainNameClaimStatus.mockResolvedValueOnce({
      status: 'processing',
      preclaim_tx_hash: 'th_pre',
    });
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/v3/transactions/th_pre')) {
        return { ok: true, json: async () => ({ block_height: -1 }) };
      }
      if (url.includes('/v3/transactions/th_')) {
        return { ok: true, json: async () => ({ block_height: 123 }) };
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
      return { ok: false, json: async () => ({}) };
    });

    const { result } = renderHook(() => useClaimChainName('ak_test_active'));
    await act(async () => {
      await expect(result.current.claimSponsoredChainName({
        name: 'averylongchain',
        onStatusChange,
        pollIntervalMs: 0,
        maxAttempts: 1,
      })).rejects.toThrow('Timed out while waiting for .chain name claim to finish');
    });

    expect(onStatusChange).toHaveBeenCalledWith(expect.objectContaining({ status: 'preclaim_pending' }));
  });

  it('caches mined transaction lookups across poll attempts', async () => {
    const onStatusChange = vi.fn();
    let preclaimFetchCount = 0;
    const processingStatus = {
      status: 'processing',
      preclaim_tx_hash: 'th_pre',
    };
    mockGetChainNameClaimStatus
      .mockResolvedValueOnce(processingStatus)
      .mockResolvedValueOnce(processingStatus)
      .mockResolvedValueOnce({
        status: 'completed',
        name: 'averylongchain.chain',
        transfer_tx_hash: 'th_transfer',
        expires_at: 999999,
      });
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/v3/transactions/th_pre')) {
        preclaimFetchCount += 1;
        return { ok: true, json: async () => ({ block_height: 123 }) };
      }
      if (url.includes('/v3/transactions/th_transfer')) {
        return { ok: true, json: async () => ({ block_height: 123 }) };
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
      return { ok: false, json: async () => ({}) };
    });

    const { result } = renderHook(() => useClaimChainName('ak_test_active'));
    await act(async () => {
      await expect(result.current.claimSponsoredChainName({
        name: 'averylongchain',
        onStatusChange,
        pollIntervalMs: 0,
        maxAttempts: 1,
      })).rejects.toThrow('Timed out while waiting for .chain name claim to finish');
    });

    expect(preclaimFetchCount).toBe(1);
  });

  it('keeps claim in transfer_pending when middleware owner mismatches', async () => {
    const onStatusChange = vi.fn();
    mockGetChainNameClaimStatus.mockResolvedValueOnce({
      status: 'completed',
      name: 'averylongchain.chain',
      transfer_tx_hash: 'th_transfer',
    });
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/v3/transactions/th_transfer')) {
        return { ok: true, json: async () => ({ block_height: 123 }) };
      }
      if (url.includes('/v3/names/averylongchain.chain')) {
        return {
          ok: true,
          json: async () => ({
            ownership: { current: 'ak_someone_else' },
            pointers: { account_pubkey: 'ak_someone_else' },
          }),
        };
      }
      return { ok: false, json: async () => ({}) };
    });

    const { result } = renderHook(() => useClaimChainName('ak_test_active'));
    await act(async () => {
      await expect(result.current.claimSponsoredChainName({
        name: 'averylongchain',
        onStatusChange,
        pollIntervalMs: 0,
        maxAttempts: 1,
      })).rejects.toThrow('Timed out while waiting for .chain name claim to finish');
    });

    expect(onStatusChange).toHaveBeenCalledWith(expect.objectContaining({ status: 'transfer_pending' }));
  });

  it('keeps claim in transfer_pending when account pointer mismatches owner', async () => {
    const onStatusChange = vi.fn();
    mockGetChainNameClaimStatus.mockResolvedValueOnce({
      status: 'completed',
      name: 'averylongchain.chain',
      transfer_tx_hash: 'th_transfer',
    });
    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/v3/transactions/th_transfer')) {
        return { ok: true, json: async () => ({ block_height: 123 }) };
      }
      if (url.includes('/v3/names/averylongchain.chain')) {
        return {
          ok: true,
          json: async () => ({
            ownership: { current: 'ak_test_active' },
            pointers: [{ key: 'account_pubkey', id: 'ak_wrong_pointer' }],
          }),
        };
      }
      return { ok: false, json: async () => ({}) };
    });

    const { result } = renderHook(() => useClaimChainName('ak_test_active'));
    await act(async () => {
      await expect(result.current.claimSponsoredChainName({
        name: 'averylongchain',
        onStatusChange,
        pollIntervalMs: 0,
        maxAttempts: 1,
      })).rejects.toThrow('Timed out while waiting for .chain name claim to finish');
    });

    expect(onStatusChange).toHaveBeenCalledWith(expect.objectContaining({ status: 'transfer_pending' }));
  });

  it('rejects when no wallet is connected at all', async () => {
    mockActiveAccount = undefined as any;
    mockWalletConnected = false;
    mockWalletInfo = undefined;
    mockAeSdkState = {
      addresses: () => [],
      _resolveAccount: () => null,
    };
    const { result } = renderHook(() => useClaimChainName());

    await act(async () => {
      await expect(result.current.claimSponsoredChainName({
        name: 'averylongchain',
        pollIntervalMs: 0,
      })).rejects.toThrow('Connect your wallet to claim a .chain name');
    });
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
