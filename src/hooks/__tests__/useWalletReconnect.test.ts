import { renderHook } from '@testing-library/react';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { useWalletReconnect } from '@/hooks/useWalletReconnect';

const mockRestoreAccount = vi.fn();
const mockConnectWallet = vi.fn();

describe('useWalletReconnect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockRestoreAccount.mockResolvedValue(undefined);
    mockConnectWallet.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns immediately when signer account is already available', async () => {
    const signerSdk = {
      _accounts: { current: { ak_ready: {} } },
    };
    const { result } = renderHook(() => useWalletReconnect({
      activeAccount: 'ak_ready',
      targetAddress: 'ak_ready',
      signerSdks: [signerSdk],
      walletConnected: true,
      restoreAccount: mockRestoreAccount,
    }));

    await expect(result.current('ak_ready')).resolves.toBe('ak_ready');
    expect(mockConnectWallet).not.toHaveBeenCalled();
  });

  it('restores static account when signer is missing', async () => {
    const signerSdks = [{ _accounts: { current: {} as Record<string, unknown> } }];
    mockRestoreAccount.mockImplementation(async () => {
      // eslint-disable-next-line no-underscore-dangle
      signerSdks[0]._accounts.current.ak_restore = {};
    });
    const { result } = renderHook(() => useWalletReconnect({
      targetAddress: 'ak_restore',
      signerSdks,
      walletConnected: true,
      restoreAccount: mockRestoreAccount,
    }));

    await expect(result.current('ak_restore')).resolves.toBe('ak_restore');
    expect(mockRestoreAccount).toHaveBeenCalledWith('ak_restore');
  });

  it('reconnects extension when walletConnected is required but false', async () => {
    const signerSdk = {
      _accounts: { current: { ak_stale: {} } },
    };
    const { result } = renderHook(() => useWalletReconnect({
      activeAccount: 'ak_stale',
      targetAddress: 'ak_stale',
      signerSdks: [signerSdk],
      walletConnected: false,
      walletInfo: { id: 'wallet' },
      connectWallet: mockConnectWallet,
      requireWalletConnectedForSigner: true,
    }));

    await expect(result.current('ak_stale')).resolves.toBe('ak_stale');
    expect(mockConnectWallet).toHaveBeenCalled();
  });

  it('rejects when wallet session is completely missing', async () => {
    const { result } = renderHook(() => useWalletReconnect({
      targetAddress: 'ak_missing',
      signerSdks: [],
      walletConnected: false,
      walletInfo: undefined,
      connectWallet: mockConnectWallet,
    }));

    await expect(result.current('ak_missing')).rejects.toThrow('Your wallet is not connected');
    expect(mockConnectWallet).not.toHaveBeenCalled();
  });

  it('times out when reconnect never succeeds', async () => {
    vi.useRealTimers();
    const { result } = renderHook(() => useWalletReconnect({
      targetAddress: 'ak_wait',
      signerSdks: [{ _accounts: { current: {} } }],
      walletConnected: false,
      walletInfo: { id: 'wallet' },
      connectWallet: mockConnectWallet,
      defaultTimeoutMs: 500,
    }));

    await expect(result.current('ak_wait')).rejects.toThrow('Your wallet is not connected');
  });
});
