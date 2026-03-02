import { renderHook } from '@testing-library/react';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { useWalletOperations } from '@/hooks/useWalletOperations';

const mockSignMessage = vi.fn();
const mockReconnectWalletSession = vi.fn();

vi.mock('@/hooks/useAeSdk', () => ({
  useAeSdk: () => ({
    aeSdk: {
      signMessage: (...args: any[]) => mockSignMessage(...args),
    },
    activeAccount: 'ak_test_wallet',
  }),
}));

vi.mock('@/hooks/useWalletConnect', () => ({
  useWalletConnect: () => ({
    reconnectWalletSession: (...args: any[]) => mockReconnectWalletSession(...args),
  }),
}));

describe('useWalletOperations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReconnectWalletSession.mockResolvedValue(true);
  });

  it('uses sdk signing when wallet session is healthy', async () => {
    mockSignMessage.mockResolvedValue('0xdeadbeef');
    const { result } = renderHook(() => useWalletOperations());

    const signed = await result.current.signMessageWithFallback('hello', 'ak_test_wallet');

    expect(signed).toEqual({
      signatureHex: 'deadbeef',
      signerAddress: 'ak_test_wallet',
      method: 'sdk',
    });
    expect(mockReconnectWalletSession).not.toHaveBeenCalled();
  });

  it('reconnects and retries sdk signing when initial signing fails', async () => {
    mockSignMessage
      .mockRejectedValueOnce(new Error('Wallet is not connected'))
      .mockResolvedValueOnce('0xdeadbeef');
    const { result } = renderHook(() => useWalletOperations());

    const signed = await result.current.signMessageWithFallback('hello', 'ak_test_wallet');

    expect(mockReconnectWalletSession).toHaveBeenCalledWith('ak_test_wallet');
    expect(signed.method).toBe('reconnect');
  });
});

