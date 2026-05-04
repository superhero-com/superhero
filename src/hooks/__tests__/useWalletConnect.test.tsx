import type { ReactNode } from 'react';
import { createStore, Provider } from 'jotai';
import { renderHook, waitFor, act } from '@testing-library/react';
import { recentActivitiesAtom } from '@/atoms/dexAtoms';
import { balanceAtom, walletInfoAtom } from '@/atoms/walletAtoms';
import { liquidityPositionsAtom } from '@/features/dex/atoms/positionsAtoms';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { useWalletConnect } from '../useWalletConnect';

const walletConnectMocks = vi.hoisted(() => {
  let currentLocation = { search: '' };
  let activeAccount: string | undefined;
  let accounts: string[] = [];
  let sdkInitialized = true;
  let latestWalletHandler: ((payload: any) => void) | undefined;

  const mockNavigate = vi.fn((to: any) => {
    if (to && typeof to === 'object' && 'search' in to) {
      currentLocation = { ...currentLocation, search: String(to.search ?? '') };
    }
  });
  const mockValidateHash = vi.fn();
  const mockAddStaticAccount = vi.fn();
  const mockDisconnectWallet = vi.fn();
  const mockScanForAccounts = vi.fn();
  const mockSetActiveAccount = vi.fn();
  const mockSetAccounts = vi.fn();
  const mockSubscribeAddress = vi.fn();
  const mockStopScan = vi.fn();
  const createdConnections: Array<{ disconnect: ReturnType<typeof vi.fn> }> = [];

  class MockBrowserWindowMessageConnection {
    disconnect = vi.fn();

    constructor() {
      createdConnections.push(this);
    }
  }

  const walletDetectorMock = vi.fn((_connection: unknown, handler: (payload: any) => void) => {
    latestWalletHandler = handler;
    return mockStopScan;
  });

  return {
    createdConnections,
    getActiveAccount: () => activeAccount,
    getLocation: () => currentLocation,
    getLatestWalletHandler: () => latestWalletHandler,
    mockAddStaticAccount,
    mockDisconnectWallet,
    mockNavigate,
    mockScanForAccounts,
    mockSetActiveAccount,
    mockSetAccounts,
    mockStopScan,
    mockSubscribeAddress,
    mockValidateHash,
    MockBrowserWindowMessageConnection,
    resetState: () => {
      currentLocation = { search: '' };
      activeAccount = undefined;
      accounts = [];
      sdkInitialized = true;
      latestWalletHandler = undefined;
      createdConnections.length = 0;
    },
    setSdkInitialized: (value: boolean) => {
      sdkInitialized = value;
    },
    getSdkInitialized: () => sdkInitialized,
    setActiveAccountValue: (value?: string) => {
      activeAccount = value;
    },
    setAccountsValue: (value: string[]) => {
      accounts = value;
    },
    getAccounts: () => accounts,
    setLocationSearch: (search: string) => {
      currentLocation = { search };
    },
    walletDetectorMock,
  };
});

vi.mock('@aeternity/aepp-sdk', () => ({
  BrowserWindowMessageConnection: walletConnectMocks.MockBrowserWindowMessageConnection,
  walletDetector: (connection: unknown, handler: (payload: any) => void) => (
    walletConnectMocks.walletDetectorMock(connection, handler)
  ),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useLocation: () => walletConnectMocks.getLocation(),
    useNavigate: () => walletConnectMocks.mockNavigate,
  };
});

vi.mock('@/hooks/useAeSdk', () => ({
  useAeSdk: () => ({
    aeSdk: {
      disconnectWallet: (...args: any[]) => walletConnectMocks.mockDisconnectWallet(...args),
      subscribeAddress: (...args: any[]) => walletConnectMocks.mockSubscribeAddress(...args),
      _accounts: { current: {} },
    },
    scanForAccounts: (...args: any[]) => walletConnectMocks.mockScanForAccounts(...args),
    addStaticAccount: (...args: any[]) => walletConnectMocks.mockAddStaticAccount(...args),
    setActiveAccount: (...args: any[]) => walletConnectMocks.mockSetActiveAccount(...args),
    setAccounts: (...args: any[]) => walletConnectMocks.mockSetAccounts(...args),
    activeAccount: walletConnectMocks.getActiveAccount(),
    accounts: walletConnectMocks.getAccounts(),
    sdkInitialized: walletConnectMocks.getSdkInitialized(),
  }),
}));

vi.mock('../../utils/address', () => ({
  validateHash: (...args: any[]) => walletConnectMocks.mockValidateHash(...args),
}));

describe('useWalletConnect', () => {
  const wrapper = ({ children }: { children: ReactNode }) => <Provider>{children}</Provider>;

  beforeEach(() => {
    walletConnectMocks.resetState();
    vi.clearAllMocks();
    localStorage.clear();
    walletConnectMocks.mockValidateHash.mockReturnValue({ valid: true });
    walletConnectMocks.mockAddStaticAccount.mockResolvedValue(undefined);
    walletConnectMocks.mockDisconnectWallet.mockResolvedValue(undefined);
    walletConnectMocks.mockScanForAccounts.mockResolvedValue(undefined);
    walletConnectMocks.mockSubscribeAddress.mockResolvedValue(undefined);
  });

  it('does not wipe per-account balance cache before sdkInitialized; clears once ready with no session', async () => {
    walletConnectMocks.setSdkInitialized(false);

    const store = createStore();
    store.set(balanceAtom, { ak_persist: 42 });

    const storeWrapper = ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    const { rerender } = renderHook(() => useWalletConnect(), { wrapper: storeWrapper });

    expect(store.get(balanceAtom)).toEqual({ ak_persist: 42 });

    walletConnectMocks.setSdkInitialized(true);
    rerender();

    await waitFor(() => {
      expect(store.get(balanceAtom)).toEqual({});
    });
  });

  it('does not wipe caches while a persisted wallet session may reconnect', async () => {
    const store = createStore();
    store.set(balanceAtom, { ak_persist: 42 });
    store.set(walletInfoAtom, { name: 'wallet' } as any);

    const storeWrapper = ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    renderHook(() => useWalletConnect(), { wrapper: storeWrapper });

    await waitFor(() => {
      expect(store.get(balanceAtom)).toEqual({ ak_persist: 42 });
    });
  });

  it('prunes per-account caches to restored sdk accounts', async () => {
    walletConnectMocks.setAccountsValue(['ak_keep']);
    walletConnectMocks.setActiveAccountValue('ak_active');

    const store = createStore();
    store.set(balanceAtom, { ak_keep: 1, ak_active: 2, ak_drop: 3 });
    store.set(recentActivitiesAtom, {
      ak_keep: [{ account: 'ak_keep', hash: 'th_keep' } as any],
      ak_drop: [{ account: 'ak_drop', hash: 'th_drop' } as any],
    });
    store.set(liquidityPositionsAtom, {
      ak_active: [{ balance: '1' } as any],
      ak_drop: [{ balance: '2' } as any],
    });

    const storeWrapper = ({ children }: { children: ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    renderHook(() => useWalletConnect(), { wrapper: storeWrapper });

    await waitFor(() => {
      expect(store.get(balanceAtom)).toEqual({ ak_keep: 1, ak_active: 2 });
      expect(store.get(recentActivitiesAtom)).toEqual({
        ak_keep: [{ account: 'ak_keep', hash: 'th_keep' }],
      });
      expect(store.get(liquidityPositionsAtom)).toEqual({
        ak_active: [{ balance: '1' }],
      });
    });
  });

  it('consumes the address query only once after restoring a valid static account', async () => {
    walletConnectMocks.setLocationSearch('?address=ak_valid');
    const { rerender } = renderHook(() => useWalletConnect(), { wrapper });

    await waitFor(() => {
      expect(walletConnectMocks.mockAddStaticAccount).toHaveBeenCalledWith('ak_valid');
    });

    expect(walletConnectMocks.mockNavigate).toHaveBeenCalledWith({ search: '' });
    walletConnectMocks.setActiveAccountValue('ak_valid');
    rerender();

    await waitFor(() => {
      expect(walletConnectMocks.getLocation().search).toBe('');
    });
    expect(walletConnectMocks.mockAddStaticAccount).toHaveBeenCalledTimes(1);
  });

  it('clears invalid address queries without trying to restore them', async () => {
    walletConnectMocks.setLocationSearch('?address=not_an_account');
    walletConnectMocks.mockValidateHash.mockReturnValueOnce({ valid: false });

    renderHook(() => useWalletConnect(), { wrapper });

    await waitFor(() => {
      expect(walletConnectMocks.mockNavigate).toHaveBeenCalledWith({ search: '' });
    });
    expect(walletConnectMocks.mockAddStaticAccount).not.toHaveBeenCalled();
  });

  it('reuses the in-flight wallet scan promise for concurrent callers', async () => {
    const { result } = renderHook(() => useWalletConnect(), { wrapper });
    const wallet = {
      info: { id: 'wallet-id', type: 'extension', origin: 'https://wallet.example' },
      getConnection: () => ({}) as any,
    };

    const firstScan = result.current.scanForWallets();
    const secondScan = result.current.scanForWallets();

    expect(walletConnectMocks.walletDetectorMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      walletConnectMocks.getLatestWalletHandler()?.({
        newWallet: wallet,
        wallets: { wallet },
      });
      await expect(firstScan).resolves.toBe(wallet);
      await expect(secondScan).resolves.toBe(wallet);
    });

    expect(walletConnectMocks.walletDetectorMock).toHaveBeenCalledTimes(1);
  });

  it('disconnects pending wallet scans and clears persisted session state', async () => {
    const { result } = renderHook(() => useWalletConnect(), { wrapper });

    localStorage.setItem('account:activeAccount', 'ak_saved');
    localStorage.setItem('wallet:walletInfo', '{"name":"wallet"}');
    localStorage.setItem('wallet:balance', '{"ak_old":1,"ak_other":2}');
    localStorage.setItem('dex:recentActivities', '{"ak_old":[]}');
    localStorage.setItem('liquidityPositions', '{"ak_old":[]}');

    const pendingScan = result.current.scanForWallets();
    const pendingConnection = walletConnectMocks.createdConnections[0];

    await act(async () => {
      await result.current.disconnectWallet();
    });

    expect(localStorage.getItem('account:activeAccount')).toBeNull();
    expect([null, 'undefined']).toContain(localStorage.getItem('wallet:walletInfo'));
    expect(localStorage.getItem('wallet:balance')).toBe('{}');
    expect(localStorage.getItem('dex:recentActivities')).toBe('{}');
    expect(localStorage.getItem('liquidityPositions')).toBe('{}');
    expect(walletConnectMocks.mockStopScan).toHaveBeenCalledTimes(1);
    expect(pendingConnection.disconnect).toHaveBeenCalledTimes(1);
    expect(walletConnectMocks.mockDisconnectWallet).toHaveBeenCalledTimes(1);
    expect(walletConnectMocks.mockSetActiveAccount).toHaveBeenCalledWith(undefined);
    expect(walletConnectMocks.mockSetAccounts).toHaveBeenCalledWith([]);

    walletConnectMocks.getLatestWalletHandler()?.({ newWallet: undefined, wallets: {} });
    await expect(pendingScan).resolves.toBeUndefined();
  });
});
