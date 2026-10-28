import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAtom } from 'jotai';
import { useModal } from '@/hooks/useModal';
import { useAeSdk } from '@/hooks/useAeSdk';
import { useWalletConnect } from '@/hooks/useWalletConnect';
import { CONFIG } from '@/config';
import {
  creatorSessionAtom, openConnectedCreatorSession, revokeCreatorSession, type CreatorLogin,
} from './shorts-wallet-session';
import { useShortsPreferences, rankShorts } from './shorts-preferences';
import { PublicationReviewPending, publishAndWait } from './shorts-publication-session';
import { ShortsFeedWindow, type FeedSnapshot, type FeedPage } from './shorts-feed-window';
import { savedFeedPage } from './shorts-saved-feed';
import { PlaybackDelivery, type PlaybackResult } from './shorts-playback';
import { shortsPlaybackProof } from './shorts-media';
import { studioContentQuery, useShortsStudioRead } from './use-shorts-studio-read';
import { useShortsSocial } from './use-shorts-social';
import { useShortsWalletTransactions, WalletActionPending } from './use-shorts-wallet-transactions';
import type { WalletMethod } from './shorts-wallet-journal';
import { request, SHORTS_API, ShortsApiError } from './api';
import { uploadDirectPart } from './shorts-direct-upload';
import { verifyShortsRelease, type ShortsRelease } from './shorts-release';
import { createShortsRefresh, subscribeShortsUpdates } from './shorts-updates';
import {
  retryableUploadRead, uploadResumeKey, waitForPreparedShort, type UploadSession,
} from './shorts-upload-session';
import type {
  Config, Dashboard, Review, Short, Performance, UploadDraft, StudioContentPage, StudioVideo,
} from './types';

export function useShorts() {
  const { activeAccount, sdk, signMessage } = useAeSdk();
  const { connectWallet } = useWalletConnect();
  const { openModal } = useModal();
  const actor = activeAccount || '';
  const currentAddress = useRef(actor);
  currentAddress.current = actor;
  const [login, setLogin] = useAtom(creatorSessionAtom);
  const navigate = useNavigate();
  const location = useLocation();
  const section = location.pathname.split('/')[3] || 'overview';
  const tab = location.pathname === '/shorts' || location.pathname === '/shorts/' ? 'feed' : ({ upload: 'publish', review: 'review' }[section] || 'studio');
  const personal = useShortsPreferences();
  const savedSelection = personal.preferences.mode === 'saved' ? JSON.stringify(personal.preferences.saved) : '';
  const followingMode = personal.preferences.mode === 'following';
  const [days, updateDays] = useState(28);
  const setDays = (value: number) => {
    updateDays(value);
    const params = new URLSearchParams(location.search);
    params.delete('cursor'); params.delete('page');
    navigate({ search: params.toString() }, { replace: true });
  };
  const [performance, setPerformance] = useState<Performance>();
  const [performanceError, setPerformanceError] = useState('');
  const [performanceRevision, setPerformanceRevision] = useState(0);
  const performanceScope = useRef('');
  const [claimReview, setClaimReview] = useState(false);
  const [commentShort, setCommentShort] = useState<Short>();
  const [commentRevision, setCommentRevision] = useState(0);
  const [commentPublishedRevision, setCommentPublishedRevision] = useState(0);
  const videoId = section === 'video' ? location.pathname.split('/')[4] : undefined;
  const [topic, setTopic] = useState('All');
  const [config, setConfig] = useState<Config>();
  const [paymentRelease, setPaymentRelease] = useState<ShortsRelease>();
  const connectionOnly = config?.creatorAccess === 'connected-wallet';
  const [creatorConnecting, setCreatorConnecting] = useState(false);
  const [creatorConnectionError, setCreatorConnectionError] = useState('');
  const creatorScope = JSON.stringify([actor, config?.network, config?.contract, config?.creatorAccess]);
  const currentCreatorScope = useRef(creatorScope);
  currentCreatorScope.current = creatorScope;
  useEffect(() => {
    currentCreatorScope.current = creatorScope;
    return () => { if (currentCreatorScope.current === creatorScope) currentCreatorScope.current = ''; };
  }, [creatorScope]);
  const authenticated = !!login && login.address === actor && login.expiresAt > Date.now()
    && login.api === SHORTS_API && login.network === CONFIG.NETWORK
    && login.network === config?.network && login.contract === config?.contract
    && (login.kind !== 'connected-wallet' || connectionOnly);
  const token = authenticated ? login.token : undefined;
  const currentLogin = useRef(login);
  currentLogin.current = login;
  const [feed, setFeed] = useState<Short[]>([]);
  const [feedWindow, setFeedWindow] = useState<FeedSnapshot>();
  const feedPager = useRef<{ key: string; window: ShortsFeedWindow } | undefined>(undefined);
  const sharedId = tab === 'feed' ? new URLSearchParams(location.search).get('short') : null;
  const [sharedResult, setSharedResult] = useState<{ id: string; video?: Short }>();
  const sharedVideo = sharedResult?.id === sharedId ? sharedResult.video : undefined;
  const social = useShortsSocial(sharedVideo ? [sharedVideo, ...feed.filter((item) => item.id !== sharedVideo.id)] : feed, actor, followingMode && tab === 'feed' && !sharedId);
  const feedSource = JSON.stringify([savedSelection, followingMode, followingMode ? social.contract : '']);
  const followingRevision = followingMode ? social.revision : 0;
  const currentFeedSource = useRef(feedSource);
  currentFeedSource.current = feedSource;
  const currentFeed = useRef(feed);
  currentFeed.current = feed;
  // Briefly bridge node/API lag after a mined Like; canonical reads then take over.
  const confirmedLikes = useRef(new Map<string, { count: number; until: number }>());
  const withConfirmedLike = useCallback((item: Short) => {
    const confirmed = confirmedLikes.current.get(item.id);
    if (!confirmed) return item;
    if (Date.now() >= confirmed.until || (item.liked && item.likes >= confirmed.count)) {
      confirmedLikes.current.delete(item.id);
      return item;
    }
    return { ...item, likes: Math.max(item.likes, confirmed.count), liked: true };
  }, []);
  useEffect(() => {
    setFeedWindow(undefined);
    return () => { feedPager.current?.window.stop(); feedPager.current = undefined; };
  }, [actor, tab, sharedId, feedSource]);
  useEffect(() => { setFeed([]); }, [feedSource]);
  const [dashboard, setDashboard] = useState<Dashboard>();
  const [dashboardScope, setDashboardScope] = useState('');
  const [dashboardError, setDashboardError] = useState('');
  const studioReadScope = JSON.stringify([actor, config?.network, config?.contract, config?.bytecodeHash]);
  const studioContent = useShortsStudioRead<StudioContentPage>(
    config?.studioPaging && tab === 'studio' && section === 'content'
      ? `/studio/content?${studioContentQuery(location.search, days)}` : undefined,
    token,
    studioReadScope,
    performanceRevision,
  );
  const studioVideo = useShortsStudioRead<StudioVideo>(
    config?.studioPaging && tab === 'studio' && videoId
      ? `/studio/video/${encodeURIComponent(videoId)}?days=${days}` : undefined,
    token,
    studioReadScope,
    performanceRevision,
  );
  const [review, setReview] = useState<Review[]>([]);
  const [preview, setPreview] = useState<{ id: string; url: string }>();
  const [busy, setBusy] = useState(false);
  const [uploadDraft, setUploadDraft] = useState<UploadDraft>();
  const [uploadEpoch, setUploadEpoch] = useState(0);
  const [preparedUpload, setPreparedUpload] = useState<{ video: Short; key: string }>();
  const [uploadPublication, setUploadPublication] = useState<{ shortId?: string; status: 'uploading' | 'publishing' | 'reviewing' | 'published' | 'error' }>();
  const [uploadProgress, setUploadProgress] = useState<number>();
  const [uploadStage, setUploadStage] = useState<'checking' | 'uploading' | 'processing'>();
  const uploadRequest = useRef<AbortController | undefined>(undefined);
  useEffect(() => () => { uploadRequest.current?.abort(); }, [creatorScope]);
  const [walletPending, setWalletPending] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'info' | 'success' | 'error'>('info');
  const setTab = (value: string) => {
    setMessage('');
    navigate({ feed: '/shorts', publish: '/shorts/studio/upload', review: '/shorts/studio/review' }[value] || '/shorts/studio');
  };
  const [like, setLike] = useState<Short>();
  const likeAfterConnect = useRef<Short | undefined>(undefined);
  const generation = useRef(0);
  const actionLock = useRef(false);
  const previousActor = useRef(actor);
  useEffect(() => {
    const changedAccount = !!previousActor.current && previousActor.current !== actor;
    previousActor.current = actor;
    confirmedLikes.current.clear();
    setFeed((items) => items.map((item) => ({ ...item, liked: false, mine: item.creator === actor })));
    setSharedResult(undefined);
    setLogin((current) => (current?.address === actor ? current : undefined));
    setCreatorConnecting(false); setCreatorConnectionError('');
    setDashboard(undefined);
    setDashboardError('');
    setPerformance(undefined);
    setClaimReview(false);
    setReview([]);
    setPreview(undefined);
    // A first connection returns to review; connecting never submits a payment.
    setLike(actor ? likeAfterConnect.current : undefined);
    if (actor) likeAfterConnect.current = undefined;
    setUploadProgress(undefined);
    if (changedAccount) {
      setUploadDraft(undefined);
      setUploadEpoch((value) => value + 1);
    }
    setPreparedUpload(undefined); setUploadPublication(undefined);
    setUploadStage(undefined);
    setMessage('');
  }, [actor, setLogin]);
  useEffect(() => {
    if (!login) return undefined;
    const timer = setTimeout(() => {
      setLogin(undefined); setDashboard(undefined); setReview([]); setPerformance(undefined);
      if (!connectionOnly) { setMessageTone('info'); setMessage('Your Studio session expired. Continue with your connected wallet.'); }
    }, Math.max(0, login.expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [login, setLogin, connectionOnly]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);
  const refresh = useCallback(async () => {
    generation.current += 1;
    const gen = generation.current;
    try {
      const c = await request<Config>('/config');
      const payment = await verifyShortsRelease(c).catch(() => undefined);
      if (gen !== generation.current || currentFeedSource.current !== feedSource) return;
      if (c.catalogPaging && tab === 'feed' && !sharedId) {
        const key = JSON.stringify([SHORTS_API, actor, c.network, c.contract, c.bytecodeHash, feedSource]);
        if (feedPager.current?.key !== key || feedPager.current.window.stopped) {
          feedPager.current?.window.stop();
          const path = followingMode ? '/feed/following' : '/feed';
          const state = (ids: string[], signal: AbortSignal) => request<{ items: Short[]; revision?: string }>(`${path}/state`, { ids, address: actor }, undefined, { signal, timeout: 30000 });
          const page = async (cursor: string | undefined, signal: AbortSignal) => {
            if (followingMode && !actor) return { items: [], next: null };
            if (followingMode && !c.followingPaging) throw new Error('Following is unavailable');
            return request<FeedPage>(`${path}?address=${encodeURIComponent(actor)}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`, undefined, undefined, { signal, timeout: 30000 });
          };
          const window = new ShortsFeedWindow({
            revisioned: followingMode && !!actor,
            page: savedSelection ? savedFeedPage(JSON.parse(savedSelection), state) : page,
            state,
            changed: (snapshot) => {
              if (feedPager.current?.window !== window || currentAddress.current !== actor
                || currentFeedSource.current !== feedSource) return;
              setFeed(snapshot.items.map(withConfirmedLike));
              setFeedWindow(snapshot);
            },
          });
          feedPager.current = { key, window };
        }
      } else {
        feedPager.current?.window.stop(); feedPager.current = undefined;
      }
      const [f, shared] = await Promise.all([
        c.catalogPaging ? feedPager.current?.window.refresh().then(() => undefined)
          : request<Short[]>(`?address=${encodeURIComponent(actor)}&topic=${encodeURIComponent(topic)}`),
        sharedId ? request<Short>(`/shared/${encodeURIComponent(sharedId)}?address=${encodeURIComponent(actor)}`).catch(() => undefined) : undefined,
      ]);
      let d: Dashboard | undefined;
      let r: Review[] = [];
      try {
        const studio = !c.catalogPaging || tab !== 'feed';
        d = token && studio ? await request<Dashboard>(c.studioPaging ? `/studio/summary?days=${days}` : '/dashboard', undefined, token) : undefined;
        r = token && studio && actor === c.operator && login?.kind !== 'connected-wallet' ? await request<Review[]>('/review', undefined, token) : [];
      } catch (error) {
        if (error instanceof ShortsApiError && error.status === 401) {
          setLogin((current) => (current?.token === token ? undefined : current));
          if (c.creatorAccess === 'connected-wallet') setCreatorConnectionError('Studio couldn’t load your account. Please try again.');
        }
        throw error;
      }
      if (gen !== generation.current) return;
      setConfig(c);
      setPaymentRelease(payment?.freeLikes && c.likeSponsorship?.enabled === true ? { ...payment.release, likeFeeAetto: payment.policy.likeFeeAetto, treasuryBps: payment.policy.treasuryBps } : undefined);
      if (f) setFeed(f.map(withConfirmedLike));
      setSharedResult(sharedId ? { id: sharedId, video: shared ? withConfirmedLike(shared) : undefined } : undefined);
      setDashboard(d); setDashboardScope(JSON.stringify([actor, c.network, c.contract, c.bytecodeHash, token]));
      setReview(r); setDashboardError('');
    } catch (error) {
      if (gen === generation.current && currentAddress.current === actor && token) {
        setDashboardError('Your account couldn’t be updated. Check your connection and try again.');
      }
      throw error;
    }
  }, [actor, topic, token, sharedId, setLogin, login?.kind, tab, days, withConfirmedLike, savedSelection, followingMode, feedSource]);
  useEffect(() => {
    let disposed = false;
    const queued = createShortsRefresh(async () => {
      if (document.visibilityState === 'hidden') return;
      try { await refresh(); } catch (error) {
        if (!disposed) setMessage(error instanceof Error ? error.message : 'Shorts could not be updated.');
      }
      if (!disposed) setPerformanceRevision((value) => value + 1);
    });
    queued.schedule();
    const stopUpdates = config?.realtime
      ? subscribeShortsUpdates(SHORTS_API, config.network, config.contract, queued.schedule) : undefined;
    const resume = () => { if (document.visibilityState !== 'hidden') queued.schedule(); };
    window.addEventListener('online', resume);
    document.addEventListener('visibilitychange', resume);
    // Fallback also advances confirmation counts and off-chain view analytics.
    const timer = setInterval(queued.schedule, config?.realtime ? 60000 : 20000);
    return () => {
      disposed = true; queued.stop(); stopUpdates?.(); clearInterval(timer);
      window.removeEventListener('online', resume);
      document.removeEventListener('visibilitychange', resume);
      generation.current += 1;
    };
  }, [refresh, config?.realtime, config?.network, config?.contract, followingRevision]);
  useEffect(() => {
    let cancelled = false;
    const scope = JSON.stringify([days, token, tab, videoId]);
    if (performanceScope.current !== scope) {
      setPerformance(undefined); setPerformanceError('');
    }
    performanceScope.current = scope;
    let requestId = 0;
    if (!token || tab === 'feed') return undefined;
    const load = () => {
      requestId += 1;
      const id = requestId;
      return request<Performance>(`/performance?days=${days}${videoId ? `&short=${encodeURIComponent(videoId)}` : ''}`, undefined, token)
        .then((value) => { if (!cancelled && id === requestId) { setPerformance(value); setPerformanceError(''); } })
        .catch((error) => { if (!cancelled && id === requestId) setPerformanceError(error.message); });
    };
    load();
    return () => { cancelled = true; };
  }, [days, token, tab, videoId, performanceRevision]);
  const sponsorSession = useRef<() => Promise<string>>(async () => { throw new Error('Wallet connection is not ready.'); });
  const walletRecovery = useShortsWalletTransactions({
    sponsorToken: () => sponsorSession.current(),
    actor,
    network: config?.network,
    contract: config?.contract,
    previousContract: config?.previousContract,
    rewardContracts: config?.release?.rewardContracts?.map((item) => item.contract),
    onUnconfirmed: (action) => {
      if (action.videoId) confirmedLikes.current.delete(action.videoId);
      refresh().catch(() => undefined);
    },
    onConfirmed: (action) => {
      if (action.address !== currentAddress.current) return;
      // Older deployments can still confirm previously signed deletion transactions.
      if (action.method === 'add_comment' || action.method === 'delete_comment') setCommentRevision((value) => value + 1);
      if (action.method === 'add_comment') setCommentPublishedRevision((value) => value + 1);
      if (action.method === 'like' && action.videoId && action.contract === config?.contract) {
        const id = action.videoId;
        const latest = currentFeed.current.find((item) => item.id === id) || sharedVideo;
        if (latest?.id === id) {
          const count = latest.likes + (latest.liked ? 0 : 1);
          confirmedLikes.current.set(id, { count, until: Date.now() + 120000 });
          generation.current += 1;
          setFeed((items) => items.map((item) => (item.id === id ? { ...item, likes: count, liked: true } : item)));
          setSharedResult((current) => (current?.video?.id === id ? { ...current, video: { ...current.video, likes: count, liked: true } } : current));
        }
      }
      setPerformanceRevision((value) => value + 1);
      setMessageTone('success');
      setMessage({
        like: 'Like confirmed.', paid_like: 'Like confirmed.', claim: 'Rewards claimed to your wallet.', withdraw: 'Short withdrawn from official playback.', add_comment: 'Comment published.', delete_comment: 'Comment deleted.',
      }[action.method]);
      refresh().catch(() => undefined);
    },
  });
  const [measurementSession] = useState(() => {
    try {
      const stored = localStorage.getItem('shorts.measurement.session');
      const session = stored && /^[a-zA-Z0-9-]{20,80}$/.test(stored) ? stored : crypto.randomUUID();
      localStorage.setItem('shorts.measurement.session', session);
      return session;
    } catch { return crypto.randomUUID?.() || ''; }
  });
  const delivery = useRef<PlaybackDelivery | undefined>(undefined);
  const getDelivery = useCallback(() => {
    if (delivery.current) return delivery.current;
    const sender = new PlaybackDelivery(
      async (id, { token: playbackToken, ...payload }) => {
        if (!playbackToken) throw new ShortsApiError('Playback measurement unavailable', 401);
        const proof = await shortsPlaybackProof(id, playbackToken);
        return request<PlaybackResult>(`/${id}/playback`, { ...payload, proof }, undefined, { keepalive: true, timeout: 10000 });
      },
      (id, counters) => {
        const update = (item: Short) => (item.id === id ? { ...item, views: counters.views, engagement: counters.engagement } : item);
        setFeed((items) => items.map(update));
        setSharedResult((current) => (current?.video?.id === id ? { ...current, video: update(current.video) } : current));
      },
    );
    delivery.current = sender;
    return sender;
  }, []);
  useEffect(() => {
    const flush = () => delivery.current?.flushPending();
    const online = () => delivery.current?.retry();
    window.addEventListener('pagehide', flush);
    window.addEventListener('online', online);
    return () => {
      const sender = delivery.current;
      // Let player cleanup enqueue its final fraction before closing this queue.
      queueMicrotask(() => {
        sender?.flushPending(); sender?.dispose();
        if (delivery.current === sender) delivery.current = undefined;
      });
      window.removeEventListener('pagehide', flush); window.removeEventListener('online', online);
    };
  }, []);
  const playback = useCallback((id: string, _event: string, seconds: number, playbackToken: string) => {
    if (!_event || !playbackToken || seconds < 2) return;
    getDelivery().enqueue(id, {
      id: `${measurementSession.slice(0, 20)}-${id}-${new Date().toISOString().slice(0, 10)}`, seconds: Math.min(60, seconds), session: measurementSession, token: playbackToken, source: new URLSearchParams(location.search).has('short') ? 'shared' : personal.preferences.mode,
    });
  }, [personal.preferences.mode, location.search, getDelivery, measurementSession]);
  const perform = async (fn: () => Promise<unknown>, success: string, backgroundRefresh = false) => {
    if (actionLock.current) return false;
    actionLock.current = true; setBusy(true); setMessage(''); setMessageTone('info');
    try {
      await fn();
      if (currentAddress.current !== actor) return true;
      setMessageTone('success');
      setMessage(success);
      // A refresh failure must not turn a confirmed payment into a retry prompt.
      setPerformanceRevision((value) => value + 1);
      const updating = refresh().catch(() => {
        if (currentAddress.current === actor) setMessage(`${success} Refresh to see the latest state.`);
      });
      if (!backgroundRefresh) await updating;
      return true;
    } catch (e) {
      if (currentAddress.current !== actor) return false;
      if (e instanceof ShortsApiError && e.status === 401) { setLogin(undefined); setDashboard(undefined); setReview([]); }
      setMessageTone(e instanceof WalletActionPending || e instanceof PublicationReviewPending ? 'info' : 'error');
      const detail = e instanceof Error ? e.message : 'Please try again.';
      setMessage(detail);
      return false;
    } finally { actionLock.current = false; setBusy(false); }
  };
  const requireLogin = () => {
    const session = currentLogin.current;
    if (!session || session.address !== actor || currentAddress.current !== actor
      || session.expiresAt <= Date.now() || session.api !== SHORTS_API
      || session.network !== config?.network || session.network !== CONFIG.NETWORK
      || session.contract !== config?.contract
      || (session.kind === 'connected-wallet' && !connectionOnly)) throw new Error('Studio is still connecting to your wallet. Please try again.');
    return session.token;
  };
  const checkNetwork = async () => {
    const { release } = await verifyShortsRelease(config!);
    if (CONFIG.NETWORK !== release.network || config?.network !== release.network
      || (await sdk.getNodeInfo()).nodeNetworkId !== release.network) {
      throw new Error(`Switch your wallet to æternity ${release.network === 'ae_uat' ? 'testnet' : 'mainnet'} before continuing.`);
    }
    if (!actor || currentAddress.current !== actor) throw new Error('Wallet changed. Reconnect and try again.');
  };
  const transact = async (
    method: WalletMethod,
    args: string[],
    amount = '0',
    previous: boolean | string = false,
    comment?: { text?: string; sequence?: string },
  ) => {
    setWalletPending(true);
    try {
      await checkNetwork();
      if (sdk.address !== actor || currentAddress.current !== actor) throw new Error('Wallet signer does not match the connected account.');
      const sponsorshipToken = method === 'like' ? await sponsorSession.current() : undefined;
      // Session authentication releases its own wallet handoff when it finishes.
      // Keep the native dialog suspended for the separate transaction approval,
      // or showModal() makes the wallet's confirmation portal inert.
      setWalletPending(true);
      setMessage('Review the transaction in your wallet…');
      return await walletRecovery.run(
        sdk,
        method,
        args[0],
        amount,
        config!,
(typeof previous === 'string' ? previous : [config!.contract, config!.previousContract][Number(previous)])!,
() => { setLike(undefined); setClaimReview(false); setWalletPending(false); },
comment,
sponsorshipToken,
      );
    } finally { setWalletPending(false); }
  };
  const connectCreator = useCallback(async () => {
    const scope = creatorScope;
    setCreatorConnecting(true); setCreatorConnectionError('');
    try {
      const next = await openConnectedCreatorSession(actor, config?.network || '', config?.contract || '');
      if (currentCreatorScope.current !== scope) throw new Error('Wallet changed while opening Studio.');
      currentLogin.current = next;
      setLogin(next);
      return next.token;
    } catch (error) {
      if (currentCreatorScope.current === scope) setCreatorConnectionError(error instanceof Error ? error.message : 'Studio could not connect. Please try again.');
      throw error;
    } finally { if (currentCreatorScope.current === scope) setCreatorConnecting(false); }
  }, [actor, config?.network, config?.contract, creatorScope, setLogin]);
  useEffect(() => {
    if (!connectionOnly || !actor || authenticated || creatorConnectionError || tab === 'feed') return;
    connectCreator().catch(() => undefined);
  }, [connectionOnly, actor, authenticated, creatorConnectionError, tab, connectCreator]);
  const ensureCreatorSession = async () => {
    if (authenticated) return requireLogin();
    if (connectionOnly) return connectCreator();
    setWalletPending(true);
    try {
      await checkNetwork();
      const c = await request<{ id: string; message: string }>('/auth/challenge', { address: actor });
      if (currentAddress.current !== actor) throw new Error('Wallet changed during verification.');
      const signature = await signMessage(c.message);
      if (currentAddress.current !== actor) throw new Error('Wallet changed during verification.');
      const next = await request<CreatorLogin>('/auth/verify', { id: c.id, signature });
      if (currentAddress.current !== actor || next.address !== actor) {
        revokeCreatorSession({ ...next, api: SHORTS_API });
        throw new Error('Wallet changed during verification.');
      }
      const session = {
        ...next, api: SHORTS_API, network: CONFIG.NETWORK, contract: config!.contract,
      };
      currentLogin.current = session;
      setLogin(session);
      return session.token;
    } finally { setWalletPending(false); }
  };
  sponsorSession.current = ensureCreatorSession;
  const signIn = () => perform(async () => {
    if (!actor) { openModal({ name: 'connect-wallet' }); return; }
    await ensureCreatorSession();
  }, actor ? 'Creator access ready. Your connected wallet is unchanged.' : 'Choose a wallet using Superhero’s connect dialog.');
  const connectForLike = () => perform(async () => {
    if (actor) return;
    likeAfterConnect.current = like;
    setWalletPending(true);
    try {
      const connected = await connectWallet();
      if (!connected) {
        likeAfterConnect.current = undefined;
        throw new Error('Wallet connection was not completed. Connect your wallet to continue.');
      }
    } catch (error) {
      likeAfterConnect.current = undefined;
      throw error;
    } finally { setWalletPending(false); }
  }, 'Wallet connected. You can now send your Like.', true);
  const prepareUpload = async (data: FormData, key: string) => {
    const file = data.get('file') as File;
    if (!file?.size || file.size > 40 * 1024 * 1024) throw new Error('Choose a video smaller than 40 MB.');
    if (!token) await ensureCreatorSession();
    uploadRequest.current?.abort();
    const controller = new AbortController();
    uploadRequest.current = controller;
    const scope = creatorScope;
    const uploadAuth = () => {
      controller.signal.throwIfAborted();
      if (currentCreatorScope.current !== scope) throw new Error('Wallet changed. Reopen your upload to continue.');
      return requireLogin();
    };
    const options = { signal: controller.signal, timeout: 15000 };
    uploadAuth();
    const hash = async (bytes: ArrayBuffer) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((v) => v.toString(16).padStart(2, '0')).join('');
    setUploadProgress(0); setUploadStage('checking');
    const details = {
      description: String(data.get('description') || ''), language: String(data.get('language') || 'und'), captions: String(data.get('captions') || ''), synthetic: data.get('synthetic') === 'true', sponsored: data.get('sponsored') === 'true',
    };
    const metadata = {
      title: String(data.get('title')), topic: String(data.get('topic')), rights: data.get('rights') === 'true', bytes: file.size, sha256: await hash(await file.arrayBuffer()), details,
    };
    const fingerprint = await hash(new TextEncoder().encode(JSON.stringify(metadata)).buffer);
    const storageKey = uploadResumeKey(SHORTS_API, config!.network, config!.contract, actor);
    let resume: UploadSession | undefined;
    let saved: { fingerprint?: string; id?: string } = {};
    try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}') || {}; } catch { /* Local resume storage is optional. */ }
    if (saved.fingerprint === fingerprint && saved.id) {
      try {
        resume = await request<UploadSession>(`/uploads/${saved.id}`, undefined, uploadAuth(), options);
      } catch (error) {
        uploadAuth();
        // A network outage must not create a second upload in place of a saved job.
        if (!(error instanceof ShortsApiError && [404, 410].includes(error.status))) throw error;
      }
    }
    if (!resume) resume = await request<UploadSession>('/uploads', metadata, uploadAuth(), options);
    try { localStorage.setItem(storageKey, JSON.stringify({ id: resume.id, expires: resume.expires, fingerprint })); } catch { /* Uploading still works without persisted resume. */ }
    const count = Math.ceil(file.size / resume.partSize);
    setUploadStage('uploading');
    for (let i = 0; i < count && !resume.complete; i += 1) {
      if (!resume.parts.includes(i)) {
        const bytes = file.slice(i * resume.partSize, (i + 1) * resume.partSize);
        if (resume.transport === 'direct-s3-v1') {
          // eslint-disable-next-line no-await-in-loop
          await uploadDirectPart(resume.id, i, bytes, { token: uploadAuth, signal: controller.signal });
        } else {
          const part = new FormData(); part.set('file', bytes, 'part');
          // Local loopback demos retain their disk-backed upload transport.
          // eslint-disable-next-line no-await-in-loop
          await request(`/uploads/${resume.id}/parts/${i}`, part, uploadAuth(), { ...options, timeout: 120000 });
        }
      }
      setUploadProgress(Math.round(((i + 1) / count) * 100));
    }
    setUploadStage('processing');
    setMessage('Upload received. Preparing your video for playback…');
    const readStatus = () => request<UploadSession>(`/uploads/${resume!.id}`, undefined, uploadAuth(), options);
    let job = resume;
    if (!['queued', 'processing', 'ready'].includes(job.status)) {
      try {
        job = await request<UploadSession>(`/uploads/${resume.id}/finish`, {}, uploadAuth(), options);
      } catch (error) {
        uploadAuth();
        if (!retryableUploadRead(error)) throw error;
        // A lost acknowledgement may already have enqueued this ID. Read it first.
        job = await readStatus();
        if (!['queued', 'processing', 'ready'].includes(job.status)) throw error;
      }
    }
    const prepared = await waitForPreparedShort(job, {
      read: readStatus,
      assertCurrent: uploadAuth,
      signal: controller.signal,
      onStatus: (status) => setMessage(status === 'queued' ? 'Your upload is saved. Waiting to prepare your video…' : 'Preparing your video for playback…'),
    });
    uploadAuth();
    setPreparedUpload({ video: prepared, key });
    setUploadProgress(undefined); setUploadStage(undefined);
    return prepared;
  };
  const completePublication = async (id: string) => {
    const scope = creatorScope;
    const controller = new AbortController();
    uploadRequest.current?.abort(); uploadRequest.current = controller;
    const auth = () => {
      controller.signal.throwIfAborted();
      if (currentCreatorScope.current !== scope) throw new Error('Wallet changed. Reopen your Short to continue.');
      return requireLogin();
    };
    try {
      return await publishAndWait(id, {
        read: () => request<Short>(`/${id}/publication`, undefined, auth(), { signal: controller.signal, timeout: 30000 }),
        submit: () => request<Short>(`/${id}/publish`, {}, auth(), { signal: controller.signal, timeout: 30000 }),
        assertCurrent: auth,
        signal: controller.signal,
        onWaiting: () => setMessage('Publishing your Short. You can safely return to it in Studio while confirmation completes.'),
      });
    } finally { if (uploadRequest.current === controller) uploadRequest.current = undefined; }
  };
  const publishUpload = (data: FormData, key: string) => perform(async () => {
    if (uploadPublication?.status === 'published') return;
    let short = preparedUpload?.key === key ? preparedUpload.video : undefined;
    setUploadPublication({ shortId: short?.id, status: short ? 'publishing' : 'uploading' });
    try {
      if (!short) short = await prepareUpload(data, key);
      requireLogin();
      setUploadPublication({ shortId: short.id, status: 'publishing' });
      const published = await completePublication(short.id);
      requireLogin();
      setPreparedUpload({ video: published, key });
      setUploadPublication({ shortId: short.id, status: 'published' });
      try { localStorage.removeItem(uploadResumeKey(SHORTS_API, config!.network, config!.contract, actor)); } catch { /* Session-only storage. */ }
    } catch (error) {
      if (currentAddress.current === actor) setUploadPublication({ shortId: short?.id, status: error instanceof PublicationReviewPending ? 'reviewing' : 'error' });
      throw error;
    } finally { setUploadStage(undefined); setUploadProgress(undefined); }
  }, 'Your Short is published.', true);
  const publish = (id: string) => perform(() => completePublication(id), 'Your Short is published.');
  const confirmLike = () => perform(async () => {
    if (!like) throw new Error('Choose a Short to Like.');
    if (like.creator === actor) throw new Error('You cannot Like your own Short.');
    if (like.liked || currentFeed.current.find((item) => item.id === like.id)?.liked) {
      throw new Error('You already liked this Short.');
    }
    const selected = like;
    if (!paymentRelease) throw new Error('Likes are temporarily unavailable for this Shorts release.');
    await transact('like', [selected.id], '0');
  }, 'Like sent.', true);
  const visibleFeed = sharedId ? [sharedVideo].filter((item): item is Short => !!item)
    : rankShorts(feed, personal.preferences, topic, social.followed);
  return {
    actor,
    commentShort,
    setCommentShort,
    commentRevision,
    commentPublishedRevision,
    connectForComments: () => perform(async () => {
      setWalletPending(true);
      try { await connectWallet(); } finally { setWalletPending(false); }
    }, 'Wallet connected.', true),
    addComment: (text: string) => perform(async () => {
      if (!commentShort || !actor) throw new Error('Connect your wallet to comment.');
      const author = await request<{ nextSequence: string }>(`/comments/authors/${encodeURIComponent(actor)}`);
      await transact('add_comment', [commentShort.id], '0', false, { text, sequence: author.nextSequence });
    }, 'Comment published.', true),
    paymentRelease,
    measurementSession,
    authenticated,
    restoringCreatorSession: !!actor && (!config || creatorConnecting || (connectionOnly && !authenticated && !creatorConnectionError)),
    creatorConnectionError,
    signIn,
    connectForLike,
    isOperator: authenticated && actor === config?.operator && login?.kind !== 'connected-wallet',
    tab,
    section,
    videoId,
    setTab,
    days,
    setDays,
    performance,
    performanceError,
    refreshPerformance: () => setPerformanceRevision((value) => value + 1),
    dashboardError,
    personal,
    social,
    connectWallet,
    playback,
    claimReview,
    setClaimReview: (value: boolean) => { setClaimReview(value); if (value) setMessage(''); },
    topic,
    setTopic,
    config,
    feed: visibleFeed,
    feedReady: !!config && (sharedId ? sharedResult?.id === sharedId : !config.catalogPaging || !!feedWindow?.ready),
    feedWindow: config?.catalogPaging && !sharedId ? feedWindow : undefined,
    loadMoreFeed: (automatic = false) => feedPager.current?.window.more(automatic),
    restartFeed: () => feedPager.current?.window.restart(),
    focusFeed: (id: string) => feedPager.current?.window.focus(id),
    shared: !!sharedId,
    dashboard: authenticated && dashboard?.account.address === actor
      && dashboardScope === JSON.stringify([actor, config?.network, config?.contract, config?.bytecodeHash, token])
      && (!config?.studioPaging || dashboard.period?.days === days) ? dashboard : undefined,
    studioContent,
    studioVideo,
    review,
    preview,
    busy,
    walletRecovery,
    uploadProgress,
    uploadDraft,
    setUploadDraft,
    uploadEpoch,
    preparedUpload,
    uploadPublication,
    publishUpload,
    publish,
    dismissPublication: () => { if (!actionLock.current) setUploadPublication(undefined); },
    resetUpload: () => {
      if (actionLock.current) return;
      setUploadDraft(undefined); setPreparedUpload(undefined);
      setUploadPublication(undefined); setMessage('');
      setUploadProgress(undefined); setUploadStage(undefined); setUploadEpoch((value) => value + 1);
    },
    uploadStage,
    walletPending,
    message,
    messageTone,
    refreshNow: () => {
      setPerformanceRevision((value) => value + 1);
      return perform(refresh, 'Account updated. Performance refresh requested.');
    },
    clearMessage: () => setMessage(''),
    like,
    setLike: (value?: Short) => { setLike(value); if (value) setMessage(''); },
    confirmLike,
    claim: () => perform(async () => { await transact('claim', []); setClaimReview(false); }, 'Rewards claimed to your wallet.'),
    claimPrevious: () => perform(() => transact('claim', [], '0', true), 'Earlier rewards claimed to your wallet.'),
    claimReward: (contract: string) => perform(() => transact('claim', [], '0', contract), 'Earlier rewards claimed to your wallet.'),
    rescan: (id: string) => perform(() => request(`/${id}/scan`, {}, requireLogin()), 'Community-guidelines status updated.'),
    moderate: (id: string, approved: boolean, reason: string, reviewedTopic: string, visualConfirmed = false) => perform(
      () => request(`/review/${id}`, {
        approved, reason, topic: reviewedTopic, visualConfirmed,
      }, requireLogin()),
      approved ? 'Approved for the feed.' : 'Excluded from the feed.',
    ),
    reviewClip: (id: string) => perform(async () => {
      const response = await fetch(`${SHORTS_API}/api/shorts/review-media/${id}`, { headers: { Authorization: `Bearer ${requireLogin()}` } });
      if (!response.ok) throw new Error('Preview unavailable. Sign in as the creator or operator.');
      setPreview({ id, url: URL.createObjectURL(await response.blob()) });
    }, 'Private review preview loaded.'),
    appeal: (id: string, explanation: string) => perform(() => request(`/${id}/appeal`, { message: explanation }, requireLogin()), 'Your request for another feed review has been submitted.'),
    report: (id: string, reportId: string, reason: string, detail: string) => perform(async () => {
      await request(`/${id}/report`, { id: reportId, reason, detail });
      personal.update({ hidden: [...personal.preferences.hidden, id] });
    }, 'Report submitted. This Short is now hidden from your feed.'),
  };
}
