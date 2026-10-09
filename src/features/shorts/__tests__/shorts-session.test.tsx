import { getDefaultStore } from 'jotai';
import { act, renderHook, waitFor } from '@testing-library/react';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { creatorSessionAtom, useSyncShortsWalletSession } from '../shorts-wallet-session';
import { useShorts } from '../use-shorts';
import type { Short } from '../types';

const mocks = vi.hoisted(() => ({
  actor: 'ak_creator',
  navigate: vi.fn(),
  call: vi.fn(),
  request: vi.fn(),
  disconnect: vi.fn(),
  connect: vi.fn(),
  openModal: vi.fn(),
  sign: vi.fn(),
  network: 'ae_uat',
  signer: '',
  pathname: '/shorts/studio',
  search: '',
}));
vi.mock('@/hooks/useAeSdk', () => ({
  useAeSdk: () => ({
    activeAccount: mocks.actor,
    signMessage: mocks.sign,
    sdk: { address: mocks.signer || mocks.actor, getNodeInfo: async () => ({ nodeNetworkId: mocks.network }), getContext: () => ({}) },
  }),
}));
vi.mock('@/hooks/useModal', () => ({ useModal: () => ({ openModal: mocks.openModal }) }));
vi.mock('@/hooks/useWalletConnect', () => ({ useWalletConnect: () => ({ connectWallet: mocks.connect, disconnectWallet: mocks.disconnect }) }));
vi.mock('@/config', () => ({ CONFIG: { NETWORK: 'ae_uat' } }));
vi.mock('@aeternity/aepp-sdk', () => ({ Contract: { initialize: async () => ({ $call: mocks.call }) } }));
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate, useLocation: () => ({ pathname: mocks.pathname, search: mocks.search }) }));
vi.mock('../api', async (original) => ({ ...await original<typeof import('../api')>(), request: mocks.request }));
vi.mock('../use-shorts-social', () => ({ useShortsSocial: () => ({ followed: [], status: 'ready', retry: vi.fn() }) }));

const dashboard = { shorts: [], pending: [], account: { available: '0.08' } };
const clip = {
  id: 'video',
  title: 'Creator clip',
  creator: 'ak_other',
  likes: 9,
  liked: false,
  mine: false,
  status: 'active',
  topic: 'Art',
  language: 'und',
  createdAt: 1,
} as Short;
const startLike = async (signIn = true) => {
  const original = mocks.request.getMockImplementation()!;
  mocks.request.mockImplementation(async (path: string, ...args: unknown[]) => (
    path.startsWith('?') ? [clip] : original(path, ...args)
  ));
  const hook = renderHook(useShorts);
  await waitFor(() => expect(hook.result.current.feed).toHaveLength(1));
  if (signIn) {
    await act(async () => { await hook.result.current.signIn(); });
    await waitFor(() => expect(hook.result.current.dashboard).toEqual(dashboard));
  }
  act(() => hook.result.current.setLike(clip));
  return hook;
};
afterEach(() => vi.unstubAllGlobals());
beforeEach(() => {
  mocks.pathname = '/shorts/studio'; mocks.search = '';
  getDefaultStore().set(creatorSessionAtom, undefined); sessionStorage.clear();
  vi.clearAllMocks(); localStorage.clear(); mocks.actor = 'ak_creator'; mocks.network = 'ae_uat'; mocks.signer = '';
  mocks.connect.mockResolvedValue(null);
  mocks.sign.mockResolvedValue('signature'); mocks.call.mockResolvedValue({ hash: 'th_confirmed' });
  mocks.request.mockImplementation(async (path: string) => {
    if (path === '/config') {
      return {
        network: 'ae_uat', operator: 'ak_operator', aci: [], contract: 'ct_test',
      };
    }
    if (path.startsWith('?')) return [];
    if (path === '/auth/challenge') return { id: 'challenge', message: 'Local sign-in' };
    if (path === '/auth/verify') return { address: mocks.actor, token: 'session', expiresAt: Date.now() + 1800000 };
    if (path === '/dashboard') return dashboard;
    return {};
  });
});

describe('Shorts wallet session and recovery', () => {
  it('counts guest playback automatically even with the legacy opt-out saved', async () => {
    mocks.pathname = '/shorts'; mocks.actor = '';
    localStorage.setItem('superhero.shorts.preferences.v1', JSON.stringify({ measured: false }));
    const original = mocks.request.getMockImplementation()!;
    let views = 0;
    mocks.request.mockImplementation(async (path: string, body?: { seconds: number }) => {
      if (path.startsWith('?')) return [{ ...clip, views }];
      if (path.endsWith('/playback')) {
        if (body!.seconds >= 2) views = 1;
        return { accepted: true, views, engagement: { score: 0.5 } };
      }
      return original(path, body);
    });
    const { result } = renderHook(useShorts);
    await waitFor(() => expect(result.current.feed).toHaveLength(1));
    expect(result.current.authenticated).toBe(false);
    expect(result.current.personal.preferences).not.toHaveProperty('measured');
    await act(async () => { result.current.playback('video', 'event', 0); });
    expect(result.current.feed[0].views).toBe(0);
    await act(async () => { result.current.playback('video', 'event', 2.5); });
    expect(result.current.feed[0].views).toBe(1);
    expect(mocks.request).toHaveBeenCalledWith('/video/playback', expect.objectContaining({ seconds: 2.5, source: 'for-you' }), undefined, { keepalive: true, timeout: 10000 });
    const event = mocks.request.mock.calls.find(([path]) => path.endsWith('/playback'))![1];
    expect(event).not.toHaveProperty('address');
    act(() => result.current.personal.update({ topics: ['Art'] }));
    await act(async () => { result.current.playback('video', 'event', 4); });
    expect(result.current.feed[0].views).toBe(1);
    expect(mocks.request).toHaveBeenLastCalledWith('/video/playback', expect.objectContaining({ id: event.id, session: event.session, seconds: 4 }), undefined, { keepalive: true, timeout: 10000 });
  });
  it('exposes an initial dashboard failure and clears it after a successful retry', async () => {
    const original = mocks.request.getMockImplementation()!;
    let unavailable = true;
    mocks.request.mockImplementation(async (path: string, ...args: unknown[]) => {
      if (path === '/dashboard' && unavailable) throw new Error('Offline');
      return original(path, ...args);
    });
    const { result } = renderHook(useShorts);
    await waitFor(() => expect(result.current.config).toBeDefined());
    await act(async () => { await result.current.signIn(); });
    await waitFor(() => expect(result.current.dashboardError).toMatch(/couldn’t be updated/));
    expect(result.current.dashboard).toBeUndefined();
    unavailable = false;
    await act(async () => { await result.current.refreshNow(); });
    expect(result.current.dashboardError).toBe('');
    expect(result.current.dashboard).toEqual(dashboard);
  });

  it('retries analytics immediately and keeps the last report during refresh', async () => {
    const hook = await startLike();
    const original = mocks.request.getMockImplementation()!;
    const report = { days: 28, marker: 'last successful report' };
    mocks.request.mockImplementation(async (path: string, ...args: unknown[]) => {
      if (path.startsWith('/performance')) return report;
      return original(path, ...args);
    });
    await act(async () => { hook.result.current.refreshPerformance(); });
    await waitFor(() => expect(hook.result.current.performance).toEqual(report));
    mocks.request.mockImplementation(async (path: string, ...args: unknown[]) => {
      if (path.startsWith('/performance')) throw new Error('Analytics offline');
      return original(path, ...args);
    });
    await act(async () => { await hook.result.current.refreshNow(); });
    await waitFor(() => expect(hook.result.current.performanceError).toBe('Analytics offline'));
    expect(hook.result.current.performance).toEqual(report);
    mocks.request.mockImplementation(async (path: string, ...args: unknown[]) => {
      if (path.startsWith('/performance')) return { ...report, marker: 'updated' };
      return original(path, ...args);
    });
    await act(async () => { hook.result.current.refreshPerformance(); });
    await waitFor(() => expect(hook.result.current.performanceError).toBe(''));
    expect(hook.result.current.performance).toEqual({ ...report, marker: 'updated' });
  });

  it('authorizes paid Likes and reward claims through their wallet transactions without an API sign-in', async () => {
    const { result } = await startLike(false);
    expect(result.current.authenticated).toBe(false);
    await act(async () => { await result.current.confirmLike(); });
    expect(mocks.sign).not.toHaveBeenCalled();
    expect(mocks.call).toHaveBeenCalledExactlyOnceWith('paid_like', [clip.id], { amount: '100000000000000000' });
    expect(mocks.request.mock.calls.some(([path]) => path.startsWith('/auth/') || path === '/receipt')).toBe(false);
    expect(result.current.feed[0]).toMatchObject({ likes: 10, liked: true });
    expect(result.current.authenticated).toBe(false);
    await act(async () => { await result.current.claim(); });
    expect(mocks.call).toHaveBeenLastCalledWith('claim', [], {});
    expect(mocks.call).toHaveBeenCalledTimes(2);
    expect(mocks.sign).not.toHaveBeenCalled();
    expect(mocks.request.mock.calls.some(([path]) => path === '/uploads')).toBe(false);
  });

  it('does not request another sign-in when a creator session has expired', async () => {
    const { result, rerender } = await startLike();
    const signed = mocks.sign.mock.calls.length;
    const authRequests = mocks.request.mock.calls.filter(([path]) => path.startsWith('/auth/')).length;
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now + 1800001);
    rerender();
    expect(result.current.authenticated).toBe(false);
    await act(async () => { await result.current.confirmLike(); });
    expect(mocks.sign).toHaveBeenCalledTimes(signed);
    expect(mocks.request.mock.calls.filter(([path]) => path.startsWith('/auth/'))).toHaveLength(authRequests);
    expect(mocks.call).toHaveBeenCalledOnce();
    expect(result.current.feed[0].liked).toBe(true);
  });

  it('connects a guest wallet and returns to review without signing or paying automatically', async () => {
    mocks.actor = '';
    const { result, rerender } = await startLike(false);
    let finish: (value: string) => void = () => undefined;
    mocks.connect.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    let connecting: Promise<unknown>;
    act(() => { connecting = result.current.connectForLike(); });
    await waitFor(() => expect(mocks.connect).toHaveBeenCalledOnce());
    mocks.actor = 'ak_connected'; rerender();
    await act(async () => { finish('ak_connected'); await connecting; });
    expect(result.current.like?.id).toBe(clip.id);
    expect(result.current.authenticated).toBe(false);
    expect(mocks.call).not.toHaveBeenCalled();
    expect(mocks.sign).not.toHaveBeenCalled();
    await act(async () => { await result.current.confirmLike(); });
    expect(mocks.call).toHaveBeenCalledOnce();
  });

  it('still rejects a wrong network or signer before asking for a paid Like', async () => {
    const { result, rerender } = await startLike(false);
    mocks.network = 'ae_mainnet'; rerender();
    await act(async () => { await result.current.confirmLike(); });
    expect(result.current.message).toContain('testnet');
    mocks.network = 'ae_uat'; mocks.signer = 'ak_someone_else'; rerender();
    await act(async () => { await result.current.confirmLike(); });
    expect(result.current.message).toContain('does not match');
    expect(mocks.call).not.toHaveBeenCalled();
    expect(mocks.sign).not.toHaveBeenCalled();
    expect(result.current.feed[0].likes).toBe(9);
  });

  it('updates a mined Like before slow receipts/refresh, and reconciles without double counting', async () => {
    const { result } = await startLike();
    const original = mocks.request.getMockImplementation()!;
    let receiptDone: (value: unknown) => void = () => undefined;
    let refreshDone: (value: unknown) => void = () => undefined;
    mocks.request.mockImplementation(async (path: string, ...args: unknown[]) => {
      if (path === '/receipt') return new Promise((resolve) => { receiptDone = resolve; });
      if (path === '/dashboard') return new Promise((resolve) => { refreshDone = resolve; });
      return original(path, ...args);
    });
    await act(async () => { await result.current.confirmLike(); });
    expect(result.current.feed[0]).toMatchObject({ likes: 10, liked: true });
    expect(result.current.like).toBeUndefined();
    expect(result.current.busy).toBe(false);
    expect(result.current.walletPending).toBe(false);
    await act(async () => { receiptDone({}); refreshDone(dashboard); });
    expect(result.current.feed[0]).toMatchObject({ likes: 10, liked: true });
    mocks.request.mockImplementation(async (path: string, ...args: unknown[]) => (
      path.startsWith('?') ? [{ ...clip, likes: 10, liked: true }] : original(path, ...args)
    ));
    await act(async () => { await result.current.refreshNow(); });
    expect(result.current.feed[0].likes).toBe(10);
    expect(mocks.call).toHaveBeenCalledTimes(1);
  });

  it('keeps pending/rejected Likes unchanged and permits one deliberate successful retry', async () => {
    const { result } = await startLike(false);
    let rejectPayment: (error: Error) => void = () => undefined;
    mocks.call.mockImplementationOnce(() => new Promise((_, reject) => { rejectPayment = reject; }));
    let payment: Promise<unknown>;
    act(() => { payment = result.current.confirmLike(); });
    await waitFor(() => expect(mocks.call).toHaveBeenCalledOnce());
    expect(result.current.feed[0]).toMatchObject({ likes: 9, liked: false });
    await act(async () => { rejectPayment(new Error('Rejected by user')); await payment; });
    expect(result.current.feed[0]).toMatchObject({ likes: 9, liked: false });
    expect(result.current.like?.id).toBe(clip.id);
    await act(async () => { await result.current.confirmLike(); });
    expect(result.current.feed[0]).toMatchObject({ likes: 10, liked: true });
  });

  it('does not add another count when a feed poll observes the Like while signing', async () => {
    const { result } = await startLike();
    const original = mocks.request.getMockImplementation()!;
    let finish: (value: unknown) => void = () => undefined;
    let finishRead: (value: unknown) => void = () => undefined;
    mocks.request.mockImplementation(async (path: string, ...args: unknown[]) => (
      path.startsWith('?') ? new Promise((resolve) => { finishRead = resolve; }) : original(path, ...args)
    ));
    // Start a poll using the same topic refresh path before the payment begins.
    act(() => result.current.setTopic('Art'));
    await waitFor(() => expect(mocks.request).toHaveBeenCalledWith(expect.stringContaining('topic=Art')));
    mocks.call.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    let payment: Promise<unknown>;
    act(() => { payment = result.current.confirmLike(); });
    await waitFor(() => expect(mocks.call).toHaveBeenCalledOnce());
    await act(async () => { finishRead([{ ...clip, likes: 10, liked: true }]); });
    expect(result.current.feed[0].likes).toBe(10);
    await act(async () => { finish({ hash: 'th_confirmed' }); await payment; });
    expect(result.current.feed[0]).toMatchObject({ likes: 10, liked: true });
  });

  it('does not carry a confirmed Like into another wallet and allows later canonical correction', async () => {
    const { result, rerender } = await startLike();
    await act(async () => { await result.current.confirmLike(); });
    expect(result.current.feed[0].likes).toBe(10);
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now + 120001);
    await act(async () => { await result.current.refreshNow(); });
    expect(result.current.feed[0]).toMatchObject({ likes: 9, liked: false });
    act(() => result.current.setLike(clip));
    await act(async () => { await result.current.confirmLike(); });
    expect(result.current.feed[0].liked).toBe(true);
    mocks.actor = 'ak_another'; rerender();
    await waitFor(() => expect(result.current.feed[0].liked).toBe(false));
    await act(async () => { await result.current.refreshNow(); });
    expect(result.current.feed[0]).toMatchObject({ likes: 9, liked: false });
  });

  it('ignores confirmation UI updates when the wallet changed while signing', async () => {
    const { result, rerender } = await startLike();
    let finish: (value: unknown) => void = () => undefined;
    mocks.call.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    let payment: Promise<unknown>;
    act(() => { payment = result.current.confirmLike(); });
    await waitFor(() => expect(mocks.call).toHaveBeenCalledOnce());
    mocks.actor = 'ak_another'; rerender();
    await act(async () => { finish({ hash: 'th_confirmed' }); await payment; });
    expect(result.current.feed[0]).toMatchObject({ likes: 9, liked: false });
  });

  it('shows the prepared upload immediately while the dashboard refresh is still pending', async () => {
    vi.stubGlobal('crypto', { subtle: { digest: async () => new Uint8Array(32).buffer } });
    const { result } = renderHook(useShorts);
    await waitFor(() => expect(result.current.config).toBeDefined());
    await act(async () => { await result.current.signIn(); });
    await waitFor(() => expect(result.current.dashboard).toEqual(dashboard));
    const prepared = { id: 'new-upload', creator: 'ak_creator', status: 'pending' };
    const original = mocks.request.getMockImplementation()!;
    let finishRefresh: (value: unknown) => void = () => undefined;
    mocks.request.mockImplementation(async (path: string, ...args: unknown[]) => {
      if (path === '/uploads') {
        return {
          id: 'upload', parts: [], partSize: 100, expires: Date.now() + 60000, complete: true,
        };
      }
      if (path === '/uploads/upload/finish' || path === '/new-upload/publish') return prepared;
      if (path === '/dashboard') return new Promise((resolve) => { finishRefresh = resolve; });
      return original(path, ...args);
    });
    const file = new File(['video'], 'owned.mp4', { type: 'video/mp4' });
    Object.defineProperty(file, 'arrayBuffer', { value: async () => new ArrayBuffer(5) });
    const data = new FormData(); data.set('file', file); data.set('title', 'Owned clip'); data.set('rights', 'true');
    let uploading: Promise<unknown>;
    act(() => { uploading = result.current.publishUpload(data, 'key'); });
    await waitFor(() => expect(result.current.preparedUpload?.video.id).toBe('new-upload'));
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(result.current.uploadPublication?.status).toBe('published');
    await act(async () => { finishRefresh({ ...dashboard, shorts: [prepared] }); await uploading; });
  });

  it('drops private data and payment review when the wallet account changes', async () => {
    const { result, rerender } = renderHook(useShorts);
    await waitFor(() => expect(result.current.config).toBeDefined());
    await act(async () => { await result.current.signIn(); });
    await waitFor(() => expect(result.current.dashboard).toEqual(dashboard));
    act(() => {
      result.current.setClaimReview(true);
      result.current.setUploadDraft({
        step: 1,
        title: 'Private draft',
        description: '',
        topic: 'Art',
        language: 'und',
        captions: '',
        synthetic: false,
        sponsored: false,
        rights: false,
      });
    });
    const previousAccountClaim = result.current.claim;
    mocks.actor = 'ak_another'; rerender();
    expect(result.current.authenticated).toBe(false);
    expect(result.current.dashboard).toBeUndefined();
    expect(result.current.claimReview).toBe(false);
    expect(result.current.uploadDraft).toBeUndefined();
    await act(async () => { await previousAccountClaim(); });
    expect(mocks.call).not.toHaveBeenCalled();
  });

  it('wallet rejection restores review and permits one deliberate retry, without duplicate signing', async () => {
    const { result } = renderHook(useShorts);
    await waitFor(() => expect(result.current.config).toBeDefined());
    await act(async () => { await result.current.signIn(); });
    const short = { id: 'video', title: 'Owned clip' } as Parameters<typeof result.current.setLike>[0];
    act(() => result.current.setLike(short));
    mocks.call.mockRejectedValueOnce(new Error('Rejected by user'));
    await act(async () => { await Promise.all([result.current.confirmLike(), result.current.confirmLike()]); });
    expect(mocks.call).toHaveBeenCalledTimes(1);
    expect(result.current.like).toEqual(short);
    expect(result.current.walletPending).toBe(false);
    expect(result.current.busy).toBe(false);
    expect(result.current.message).toContain('Cancelled in your wallet');
    await act(async () => { await result.current.confirmLike(); });
    expect(mocks.call).toHaveBeenCalledTimes(2);
    expect(result.current.like).toBeUndefined();
    expect(result.current.messageTone).toBe('success');
  });
});

describe('Shared links remain separate from the discovery feed', () => {
  it('loads an active paid video by link even when it is not returned by the feed', async () => {
    mocks.pathname = '/shorts'; mocks.search = '?short=hidden';
    const original = mocks.request.getMockImplementation()!;
    mocks.request.mockImplementation(async (path: string, ...args: unknown[]) => {
      if (path.startsWith('/shared/hidden')) {
        return {
          ...clip, id: 'hidden', status: 'rejected', contentWarning: 'feed-excluded',
        };
      }
      return original(path, ...args);
    });
    const hook = renderHook(useShorts);
    await waitFor(() => expect(hook.result.current.feedReady).toBe(true));
    expect(hook.result.current.feed).toMatchObject([{ id: 'hidden', contentWarning: 'feed-excluded' }]);
    mocks.search = ''; hook.rerender();
    await waitFor(() => expect(hook.result.current.shared).toBe(false));
    expect(hook.result.current.feed).toEqual([]);
  });

  it('does not fall back to a cached clip when a shared link becomes unavailable', async () => {
    mocks.pathname = '/shorts'; mocks.search = '?short=expired';
    const original = mocks.request.getMockImplementation()!;
    mocks.request.mockImplementation(async (path: string, ...args: unknown[]) => {
      if (path.startsWith('/shared/')) throw new Error('Video is not available');
      return original(path, ...args);
    });
    const hook = renderHook(useShorts);
    await waitFor(() => expect(hook.result.current.feedReady).toBe(true));
    expect(hook.result.current.feed).toEqual([]);
  });
});

const enableConnectedStudio = () => {
  const original = mocks.request.getMockImplementation()!;
  mocks.request.mockImplementation(async (path: string, body?: { address?: string }, ...args: unknown[]) => {
    if (path === '/config') return { ...await original(path), creatorAccess: 'connected-wallet' };
    if (path === '/auth/connect') {
      return {
        address: body?.address, token: `connected-${body?.address}`, kind: 'connected-wallet', expiresAt: Date.now() + 1800000,
      };
    }
    return original(path, body, ...args);
  });
};

describe('Connection-only local Studio', () => {
  it('opens all creator data from the main connection and requests only the claim transaction', async () => {
    enableConnectedStudio();
    const hook = renderHook(useShorts);
    await waitFor(() => expect(hook.result.current.dashboard).toEqual(dashboard));
    expect(hook.result.current.authenticated).toBe(true);
    expect(mocks.request.mock.calls.filter(([path]) => path === '/auth/connect')).toHaveLength(1);
    expect(mocks.request).toHaveBeenCalledWith('/auth/connect', { address: 'ak_creator' });
    expect(mocks.sign).not.toHaveBeenCalled();
    expect(mocks.openModal).not.toHaveBeenCalled();
    expect(mocks.connect).not.toHaveBeenCalled();
    await act(async () => { await hook.result.current.claim(); });
    expect(mocks.call).toHaveBeenCalledExactlyOnceWith('claim', [], {});
    expect(mocks.request.mock.calls.some(([path]) => path === '/auth/challenge' || path === '/auth/verify')).toBe(false);
    hook.unmount();
    mocks.pathname = '/shorts/studio/upload';
    const again = renderHook(useShorts);
    await waitFor(() => expect(again.result.current.authenticated).toBe(true));
    expect(mocks.request.mock.calls.filter(([path]) => path === '/auth/connect')).toHaveLength(1);
  });

  it('renews an expired connected session automatically without a signature', async () => {
    enableConnectedStudio();
    const hook = renderHook(useShorts);
    await waitFor(() => expect(hook.result.current.authenticated).toBe(true));
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now + 1800001);
    hook.rerender();
    await waitFor(() => expect(mocks.request.mock.calls.filter(([path]) => path === '/auth/connect')).toHaveLength(2));
    await waitFor(() => expect(hook.result.current.authenticated).toBe(true));
    expect(mocks.sign).not.toHaveBeenCalled();
  });

  it('uploads with the connected Studio session without an ownership or payment signature', async () => {
    enableConnectedStudio();
    vi.stubGlobal('crypto', { subtle: { digest: async () => new Uint8Array(32).buffer } });
    const original = mocks.request.getMockImplementation()!;
    mocks.request.mockImplementation(async (path: string, ...args: unknown[]) => {
      if (path === '/uploads') {
        return {
          id: 'draft', parts: [], partSize: 100, complete: true, expires: Date.now() + 60000,
        };
      }
      if (path === '/uploads/draft/finish' || path === '/draft/publish') return { ...clip, id: 'draft', creator: 'ak_creator' };
      return original(path, ...args);
    });
    const hook = renderHook(useShorts);
    await waitFor(() => expect(hook.result.current.authenticated).toBe(true));
    const file = new File(['video'], 'owned.mp4', { type: 'video/mp4' });
    Object.defineProperty(file, 'arrayBuffer', { value: async () => new ArrayBuffer(5) });
    const data = new FormData(); data.set('file', file); data.set('title', 'Owned clip');
    await act(async () => { await hook.result.current.publishUpload(data, 'connected-draft'); });
    expect(hook.result.current.preparedUpload?.video.id).toBe('draft');
    expect(mocks.request).toHaveBeenCalledWith('/uploads/draft/finish', {}, 'connected-ak_creator');
    expect(mocks.sign).not.toHaveBeenCalled();
    expect(mocks.call).not.toHaveBeenCalled();
    expect(mocks.request.mock.calls.some(([path]) => path === '/auth/challenge' || path === '/auth/verify')).toBe(false);
  });

  it('discards a late connection for a previous account and clears data on disconnect', async () => {
    enableConnectedStudio();
    const original = mocks.request.getMockImplementation()!;
    let finish: (value: unknown) => void = () => undefined;
    mocks.request.mockImplementation(async (path: string, body?: { address?: string }, ...args: unknown[]) => {
      if (path === '/auth/connect' && body?.address === 'ak_creator') return new Promise((resolve) => { finish = resolve; });
      return original(path, body, ...args);
    });
    const hook = renderHook(useShorts);
    await waitFor(() => expect(mocks.request).toHaveBeenCalledWith('/auth/connect', { address: 'ak_creator' }));
    mocks.actor = 'ak_other'; hook.rerender();
    await waitFor(() => expect(hook.result.current.authenticated).toBe(true));
    await act(async () => {
      finish({
        address: 'ak_creator', token: 'late', kind: 'connected-wallet', expiresAt: Date.now() + 60000,
      });
    });
    expect(getDefaultStore().get(creatorSessionAtom)?.address).toBe('ak_other');
    mocks.actor = ''; hook.rerender();
    expect(hook.result.current.dashboard).toBeUndefined();
    expect(getDefaultStore().get(creatorSessionAtom)).toBeUndefined();
    expect(mocks.sign).not.toHaveBeenCalled();
  });

  it('shows a recoverable API connection error instead of opening the wallet or retrying in a loop', async () => {
    enableConnectedStudio();
    const original = mocks.request.getMockImplementation()!;
    let offline = true;
    mocks.request.mockImplementation(async (path: string, ...args: unknown[]) => {
      if (path === '/auth/connect' && offline) throw new Error('Studio is offline');
      return original(path, ...args);
    });
    const hook = renderHook(useShorts);
    await waitFor(() => expect(hook.result.current.creatorConnectionError).toBe('Studio is offline'));
    expect(hook.result.current.restoringCreatorSession).toBe(false);
    expect(mocks.request.mock.calls.filter(([path]) => path === '/auth/connect')).toHaveLength(1);
    offline = false;
    await act(async () => { await hook.result.current.signIn(); });
    await waitFor(() => expect(hook.result.current.authenticated).toBe(true));
    expect(mocks.sign).not.toHaveBeenCalled();
  });

  it('never grants operator tools to a connection-only session for the operator address', async () => {
    mocks.actor = 'ak_operator';
    enableConnectedStudio();
    const hook = renderHook(useShorts);
    await waitFor(() => expect(hook.result.current.dashboard).toEqual(dashboard));
    expect(hook.result.current.isOperator).toBe(false);
    expect(mocks.request.mock.calls.some(([path]) => path === '/review')).toBe(false);
  });
});

describe('Creator access follows the main wallet', () => {
  it('restores verified access after leaving Shorts without reconnecting or signing again', async () => {
    const first = await startLike();
    first.unmount();
    mocks.pathname = '/shorts/studio/upload';
    const second = renderHook(useShorts);
    await waitFor(() => expect(second.result.current.dashboard).toEqual(dashboard));
    expect(second.result.current.authenticated).toBe(true);
    await act(async () => { await second.result.current.signIn(); });
    expect(mocks.sign).toHaveBeenCalledOnce();
    expect(mocks.connect).not.toHaveBeenCalled();
    expect(mocks.disconnect).not.toHaveBeenCalled();
    expect(sessionStorage.getItem('shorts:creator-session')).toContain('ct_test');
  });

  it('uses the main connect dialog for guests and never reconnects a connected account', async () => {
    mocks.actor = '';
    const hook = renderHook(useShorts);
    await waitFor(() => expect(hook.result.current.config).toBeDefined());
    await act(async () => { await hook.result.current.signIn(); });
    expect(mocks.openModal).toHaveBeenCalledWith({ name: 'connect-wallet' });
    expect(mocks.connect).not.toHaveBeenCalled();
    expect(mocks.sign).not.toHaveBeenCalled();
    mocks.actor = 'ak_creator'; hook.rerender();
    await act(async () => { await hook.result.current.signIn(); });
    expect(mocks.sign).toHaveBeenCalledOnce();
    expect(mocks.connect).not.toHaveBeenCalled();
  });

  it('clears private access when the main wallet switches or disconnects outside Shorts', async () => {
    const first = await startLike(); first.unmount();
    const sync = renderHook(({ address }) => useSyncShortsWalletSession(address), { initialProps: { address: 'ak_creator' } });
    expect(getDefaultStore().get(creatorSessionAtom)).toBeDefined();
    sync.rerender({ address: 'ak_other' });
    expect(getDefaultStore().get(creatorSessionAtom)).toBeUndefined();
    expect(sessionStorage.getItem('shorts:creator-session')).toBeNull();
    sync.rerender({ address: 'ak_creator' });
    const second = await startLike(); second.unmount();
    sync.rerender({ address: '' });
    expect(getDefaultStore().get(creatorSessionAtom)).toBeUndefined();
  });

  it.each([{ api: 'http://other.invalid' }, { network: 'ae_mainnet' }, { contract: 'ct_other' }])('does not restore a session with a changed scope: %j', async (change) => {
    const first = await startLike(); first.unmount();
    const valid = getDefaultStore().get(creatorSessionAtom)!;
    act(() => getDefaultStore().set(creatorSessionAtom, { ...valid, ...change }));
    const hook = renderHook(useShorts);
    await waitFor(() => expect(hook.result.current.config).toBeDefined());
    expect(hook.result.current.authenticated).toBe(false);
    expect(mocks.sign).toHaveBeenCalledOnce();
  });

  it('invalidates a revoked server session without disconnecting the main wallet', async () => {
    const first = await startLike(); first.unmount();
    const { ShortsApiError } = await import('../api');
    const original = mocks.request.getMockImplementation()!;
    mocks.request.mockImplementation(async (path: string, ...args: unknown[]) => {
      if (path === '/dashboard') throw new ShortsApiError('Session expired', 401);
      return original(path, ...args);
    });
    const hook = renderHook(useShorts);
    await waitFor(() => expect(getDefaultStore().get(creatorSessionAtom)).toBeUndefined());
    expect(hook.result.current.actor).toBe('ak_creator');
    expect(hook.result.current.authenticated).toBe(false);
    expect(mocks.disconnect).not.toHaveBeenCalled();
  });

  it('discards verification completed after the connected account changed', async () => {
    const original = mocks.request.getMockImplementation()!;
    let finish: (value: unknown) => void = () => undefined;
    mocks.request.mockImplementation(async (path: string, ...args: unknown[]) => {
      if (path === '/auth/verify') return new Promise((resolve) => { finish = resolve; });
      return original(path, ...args);
    });
    const hook = renderHook(useShorts);
    await waitFor(() => expect(hook.result.current.config).toBeDefined());
    let operation: Promise<unknown>;
    act(() => { operation = hook.result.current.signIn(); });
    await waitFor(() => expect(mocks.request).toHaveBeenCalledWith('/auth/verify', { id: 'challenge', signature: 'signature' }));
    mocks.actor = 'ak_other'; hook.rerender();
    await act(async () => { finish({ address: 'ak_creator', token: 'old', expiresAt: Date.now() + 60000 }); await operation; });
    expect(getDefaultStore().get(creatorSessionAtom)).toBeUndefined();
  });
});

it('verifies the existing wallet once and continues the requested upload without reconnecting', async () => {
  vi.stubGlobal('crypto', { subtle: { digest: async () => new Uint8Array(32).buffer } });
  const original = mocks.request.getMockImplementation()!;
  mocks.request.mockImplementation(async (path: string, ...args: unknown[]) => {
    if (path === '/uploads') {
      return {
        id: 'draft', parts: [], partSize: 100, complete: true, expires: Date.now() + 60000,
      };
    }
    if (path === '/uploads/draft/finish' || path === '/draft/publish') {
      return {
        ...clip, id: 'draft', creator: 'ak_creator', publicationStatus: 'draft',
      };
    }
    return original(path, ...args);
  });
  const hook = renderHook(useShorts);
  await waitFor(() => expect(hook.result.current.config).toBeDefined());
  const file = new File(['video'], 'owned.mp4', { type: 'video/mp4' });
  Object.defineProperty(file, 'arrayBuffer', { value: async () => new ArrayBuffer(5) });
  const data = new FormData(); data.set('file', file); data.set('title', 'Owned clip');
  mocks.sign.mockRejectedValueOnce(new Error('Rejected by user'));
  await act(async () => { await hook.result.current.publishUpload(data, 'draft-key'); });
  expect(mocks.request.mock.calls.some(([path]) => path === '/uploads')).toBe(false);
  expect(hook.result.current.preparedUpload).toBeUndefined();
  await act(async () => { await hook.result.current.publishUpload(data, 'draft-key'); });
  expect(hook.result.current.preparedUpload?.video.id).toBe('draft');
  expect(hook.result.current.authenticated).toBe(true);
  expect(mocks.connect).not.toHaveBeenCalled();
  expect(mocks.disconnect).not.toHaveBeenCalled();
  expect(mocks.call).not.toHaveBeenCalled();
  const count = mocks.sign.mock.calls.length;
  await act(async () => { await hook.result.current.publishUpload(data, 'draft-key'); });
  expect(mocks.sign).toHaveBeenCalledTimes(count);
});

it('publishes for free and safely retries the same prepared video after a lost response', async () => {
  enableConnectedStudio();
  vi.stubGlobal('crypto', { subtle: { digest: async () => new Uint8Array(32).buffer } });
  const original = mocks.request.getMockImplementation()!;
  let attempts = 0;
  mocks.request.mockImplementation(async (path: string, ...args: unknown[]) => {
    if (path === '/uploads') {
      return {
        id: 'free', parts: [], partSize: 100, complete: true, expires: Date.now() + 60000,
      };
    }
    if (path === '/uploads/free/finish') return { ...clip, id: 'free', creator: mocks.actor };
    if (path === '/free/publish') {
      attempts += 1;
      if (attempts === 1) throw new Error('Connection lost');
      return {
        ...clip, id: 'free', creator: mocks.actor, publicationStatus: 'published',
      };
    }
    return original(path, ...args);
  });
  const { result } = renderHook(useShorts);
  await waitFor(() => expect(result.current.authenticated).toBe(true));
  const file = new File(['video'], 'owned.mp4');
  Object.defineProperty(file, 'arrayBuffer', { value: async () => new ArrayBuffer(5) });
  const data = new FormData(); data.set('file', file);
  await act(async () => { await result.current.publishUpload(data, 'same-video'); });
  expect(result.current.uploadPublication?.status).toBe('error');
  expect(result.current.preparedUpload?.video.id).toBe('free');
  await act(async () => { await Promise.all([result.current.publishUpload(data, 'same-video'), result.current.publishUpload(data, 'same-video')]); });
  expect(result.current.uploadPublication?.status).toBe('published');
  expect(attempts).toBe(2);
  expect(mocks.request.mock.calls.filter(([path]) => path === '/uploads')).toHaveLength(1);
  expect(mocks.call).not.toHaveBeenCalled(); expect(mocks.sign).not.toHaveBeenCalled();
});
