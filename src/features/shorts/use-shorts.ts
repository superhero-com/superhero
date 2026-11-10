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
import { PublicationReviewPending, publicationProgress, publishAndWait } from './shorts-publication-session';
import { ShortsFeedWindow, type FeedSnapshot, type FeedPage } from './shorts-feed-window';
import { savedFeedPage } from './shorts-saved-feed';
import { PlaybackDelivery, type PlaybackResult } from './shorts-playback';
import { shortsPlaybackProof } from './shorts-media';
import { studioContentQuery, useShortsStudioRead } from './use-shorts-studio-read';
import { useShortsSocial } from './use-shorts-social';
import { useShortsWalletTransactions, WalletActionPending } from './use-shorts-wallet-transactions';
import type { WalletMethod } from './shorts-wallet-journal';
import { likeFailurePhase, type LikePhase } from './shorts-like-feedback';
import type { PublishedComment } from './shorts-comment-page';
import { request, SHORTS_API, ShortsApiError } from './api';
import { hashUploadFile, uploadDirectPart } from './shorts-direct-upload';
import {
  ORIGINAL_UPLOAD_MAX_BYTES, readSavedUpload, uploadCapability, uploadSelectionLimit, uploadSizeLabel, uploadSourceSnapshot, validateUploadSession,
} from './shorts-upload-policy';
import { verifyShortsRelease, type ShortsRelease } from './shorts-release';
import { createShortsRefresh, subscribeShortsUpdates } from './shorts-updates';
import {
  retryableUploadRead, uploadResumeKey, waitForPreparedShort, type UploadSession,
} from './shorts-upload-session';
import {
  readUploadCreation, saveUploadCreation, confirmUploadCreation, uploadCreationKey,
} from './shorts-upload-creation';
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
  const [publishedComment, setPublishedComment] = useState<PublishedComment>();
  const videoId = section === 'video' ? location.pathname.split('/')[4] : undefined;
  const [topic, setTopic] = useState('All');
  const [config, setConfig] = useState<Config>();
  const [configError, setConfigError] = useState('');
  const [releaseError, setReleaseError] = useState('');
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
  const previewRequest = useRef<AbortController | undefined>(undefined);
  useEffect(() => () => { previewRequest.current?.abort(); }, [creatorScope]);
  const [busy, setBusy] = useState(false);
  const [uploadDraft, setUploadDraft] = useState<UploadDraft>();
  const [uploadEpoch, setUploadEpoch] = useState(0);
  const [preparedUpload, setPreparedUpload] = useState<{ video: Short; key: string }>();
  const [uploadPublication, setUploadPublication] = useState<{ shortId?: string; status: 'uploading' | 'publishing' | 'reviewing' | 'registered' | 'rechecking' | 'published' | 'error' }>();
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
  const [likePhase, setLikePhase] = useState<LikePhase>('signing');
  const likeAfterConnect = useRef<{ short: Short; address?: string } | undefined>(undefined);
  useEffect(() => () => { likeAfterConnect.current = undefined; }, []);
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
    // Preserve only an explicit Like intent during its first wallet connection.
    // Account changes invalidate it; mounting/reconnecting alone never signs.
    if (changedAccount) likeAfterConnect.current = undefined;
    if (!likeAfterConnect.current) setLike(undefined);
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
      const c = await request<Config>('/config', undefined, undefined, { timeout: 20000 }).catch((error) => {
        if (gen === generation.current) setConfigError('Studio settings couldn’t load. Check your connection and try again.');
        throw error;
      });
      if (gen !== generation.current) return;
      setConfigError('');
      let verificationError = '';
      const payment = await verifyShortsRelease(c).catch((error) => {
        verificationError = error instanceof Error ? error.message : 'Shorts release verification failed. Please try again.';
        return undefined;
      });
      if (gen !== generation.current || currentFeedSource.current !== feedSource) return;
      setReleaseError(verificationError);
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
  const walletRecovery = useShortsWalletTransactions({
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
      if (action.method === 'add_comment' && action.videoId && action.tx && action.args?.[3]) {
        setPublishedComment({
          videoId: action.videoId, author: action.address, sequence: action.args[3], tx: action.tx,
        });
      }
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
  const perform = async (fn: () => Promise<unknown>, success: string, { backgroundRefresh = false, transactionNotification = false, pending = 'Updating…' } = {}) => {
    if (actionLock.current) return false;
    actionLock.current = true; setBusy(true); setMessage(transactionNotification ? '' : pending); setMessageTone('info');
    try {
      await fn();
      if (currentAddress.current !== actor) return true;
      setMessageTone('success');
      setMessage(transactionNotification ? '' : success);
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
      setMessage(transactionNotification && e instanceof WalletActionPending ? '' : detail);
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
      setMessage('');
      return await walletRecovery.run(
        sdk,
        method,
        args[0],
        amount,
        config!,
(typeof previous === 'string' ? previous : [config!.contract, config!.previousContract][Number(previous)])!,
() => { setLike(undefined); setClaimReview(false); setWalletPending(false); },
comment,
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
  const signIn = () => perform(async () => {
    if (!actor) { openModal({ name: 'connect-wallet' }); return; }
    await ensureCreatorSession();
  }, actor ? 'Creator access ready. Your connected wallet is unchanged.' : 'Choose a wallet using Superhero’s connect dialog.');
  const connectForLike = (selected = like) => perform(async () => {
    if (actor || !selected) return;
    const intent = { short: selected, address: undefined as string | undefined };
    likeAfterConnect.current = intent;
    setLike(selected); setLikePhase('connecting');
    setWalletPending(true);
    try {
      const connected = await connectWallet();
      if (likeAfterConnect.current !== intent) return;
      if (!connected) {
        throw new Error('Wallet connection cancelled.');
      }
      intent.address = connected;
    } catch (error) {
      if (likeAfterConnect.current === intent) {
        likeAfterConnect.current = undefined;
        setLikePhase(likeFailurePhase(error));
      }
      throw error;
    } finally { setWalletPending(false); }
  }, '', { backgroundRefresh: true, transactionNotification: true });
  const currentUploadCapability = uploadCapability(config);
  const resumeStorageKey = config && actor ? uploadResumeKey(SHORTS_API, config.network, config.contract, actor) : '';
  const savedUpload = resumeStorageKey ? readSavedUpload(resumeStorageKey) : undefined;
  const pendingCreation = resumeStorageKey ? readUploadCreation(resumeStorageKey) : undefined;
  const uploadMaxBytes = currentUploadCapability ? Math.max(uploadSelectionLimit(currentUploadCapability.maxBytes, savedUpload), pendingCreation?.source.bytes || 0) : 0;
  const uploadLimitLabel = currentUploadCapability ? uploadSizeLabel(currentUploadCapability.maxBytes) : undefined;
  const prepareUpload = async (data: FormData, key: string) => {
    const file = data.get('file') as File;
    if (!currentUploadCapability) throw new Error('Upload settings are unavailable. Please reload.');
    if (!file?.size || file.size > ORIGINAL_UPLOAD_MAX_BYTES) throw new Error('Choose a video within the supported upload limit.');
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
      title: String(data.get('title')), topic: String(data.get('topic')), rights: data.get('rights') === 'true', bytes: file.size, sha256: await hashUploadFile(file, uploadAuth), details,
    };
    const fingerprint = await hash(new TextEncoder().encode(JSON.stringify(metadata)).buffer);
    const storageKey = uploadResumeKey(SHORTS_API, config!.network, config!.contract, actor);
    let resume: UploadSession | undefined;
    const saved = readSavedUpload(storageKey);
    let pending = readUploadCreation(storageKey, true);
    if (pending?.fingerprint !== fingerprint) pending = undefined;
    if (pending && (pending.source.bytes !== metadata.bytes || pending.source.sha256 !== metadata.sha256)) throw new Error('The pending upload does not match this file. Start a new upload to continue.');
    const expire = () => {
      localStorage.removeItem(uploadCreationKey(storageKey));
      localStorage.removeItem(storageKey);
      throw new Error('Your previous upload expired. Submit again to start a new upload.');
    };
    if (saved?.fingerprint === fingerprint) {
      try {
        resume = await request<UploadSession>(`/uploads/${saved.id}`, undefined, uploadAuth(), options);
        validateUploadSession(resume, metadata, saved.id);
      } catch (error) {
        uploadAuth();
        if (pending) {
          if (error instanceof ShortsApiError && error.status === 410) expire();
          throw error;
        }
        // A network outage must not create a second upload in place of a saved job.
        if (!(error instanceof ShortsApiError && [404, 410].includes(error.status))) throw error;
      }
    }
    if (!resume) {
      if (!pending && file.size > currentUploadCapability.maxBytes) throw new Error(`New uploads are limited to ${uploadSizeLabel(currentUploadCapability.maxBytes)}. To resume a saved file, keep its original upload details.`);
      if (!pending && currentUploadCapability.creation === 'request-key-v1') {
        pending = {
          key: crypto.randomUUID(),
          fingerprint,
          source: {
            bytes: metadata.bytes, sha256: metadata.sha256, maxBytes: currentUploadCapability.maxBytes, format: currentUploadCapability.format,
          },
          expectedFormat: currentUploadCapability.format,
        };
        saveUploadCreation(storageKey, pending);
      }
      const expectedFormat = currentUploadCapability.format;
      try {
        resume = await request<UploadSession>('/uploads', { ...metadata, expectedFormat, ...(pending ? { requestKey: pending.key } : {}) }, uploadAuth(), options);
      } catch (error) {
        uploadAuth();
        if (pending && error instanceof ShortsApiError && error.status === 410) expire();
        throw error;
      }
      uploadAuth();
      if (pending) confirmUploadCreation(resume, pending);
    }
    validateUploadSession(resume, metadata);
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        id: resume.id, expires: resume.expires, fingerprint, source: uploadSourceSnapshot(resume.source),
      }));
    } catch { /* Uploading still works without persisted resume. */ }
    const count = Math.ceil(file.size / resume.partSize);
    setUploadStage('uploading');
    for (let i = 0; i < count && !resume.complete; i += 1) {
      if (!resume.parts.includes(i)) {
        const bytes = file.slice(i * resume.partSize, (i + 1) * resume.partSize);
        // eslint-disable-next-line no-await-in-loop
        await uploadDirectPart(resume.id, i, bytes, { token: uploadAuth, signal: controller.signal });
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
  // Verification of the mined transaction releases the form. Public delivery still follows the journal.
  const deliveryId = uploadPublication && ['registered', 'rechecking'].includes(uploadPublication.status)
    ? uploadPublication.shortId : undefined;
  useEffect(() => {
    if (!deliveryId || !token) return undefined;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const checkDelivery = async () => {
      try {
        const video = await request<Short>(`/${deliveryId}/publication`, undefined, token, { signal: controller.signal, timeout: 15000 });
        if (controller.signal.aborted || currentCreatorScope.current !== creatorScope || video.id !== deliveryId) return;
        const progress = publicationProgress(video);
        const status = {
          published: 'published', registered: 'registered', failed: 'error', waiting: 'rechecking',
        } as const;
        setUploadPublication((current) => (current?.shortId === deliveryId ? { ...current, status: status[progress] } : current));
        if (progress === 'published') return;
        if (progress === 'failed') {
          setMessageTone('error'); setMessage('Publication failed. Your draft is saved in Studio.');
          return;
        }
      } catch (error) {
        // Login renewal starts a fresh observer; an expired session cannot poll for delivery.
        if (error instanceof ShortsApiError && error.status === 401) return;
      }
      if (!controller.signal.aborted) timer = setTimeout(checkDelivery, 5000);
    };
    timer = setTimeout(checkDelivery, 5000);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [deliveryId, token, creatorScope]);
  const publishUpload = (data: FormData, key: string) => perform(async () => {
    if (uploadPublication && ['published', 'registered', 'rechecking'].includes(uploadPublication.status)) return;
    let short = preparedUpload?.key === key ? preparedUpload.video : undefined;
    setUploadPublication({ shortId: short?.id, status: short ? 'publishing' : 'uploading' });
    try {
      if (!short) short = await prepareUpload(data, key);
      requireLogin();
      setUploadPublication({ shortId: short.id, status: 'publishing' });
      const published = await completePublication(short.id);
      requireLogin();
      setPreparedUpload({ video: published, key });
      setUploadPublication({ shortId: short.id, status: published.publicationStatus === 'published' ? 'published' : 'registered' });
      try {
        const resumeKey = uploadResumeKey(SHORTS_API, config!.network, config!.contract, actor);
        localStorage.removeItem(resumeKey); localStorage.removeItem(uploadCreationKey(resumeKey));
      } catch { /* Session-only storage. */ }
    } catch (error) {
      if (currentAddress.current === actor) setUploadPublication({ shortId: short?.id, status: error instanceof PublicationReviewPending ? 'reviewing' : 'error' });
      throw error;
    } finally { setUploadStage(undefined); setUploadProgress(undefined); }
  }, 'Your Short is registered.', { backgroundRefresh: true, pending: 'Uploading your Short' });
  const publish = (id: string) => perform(() => completePublication(id), 'Your Short is registered.', { backgroundRefresh: true, pending: 'Publishing your Short' });
  const confirmLike = (selected = like) => perform(async () => {
    if (!selected) throw new Error('Choose a Short to Like.');
    setLike(selected); setLikePhase('signing');
    try {
      if (selected.creator === actor) throw new Error('You cannot Like your own Short.');
      if (selected.liked || currentFeed.current.find((item) => item.id === selected.id)?.liked) {
        throw new Error('You already liked this Short.');
      }
      if (!paymentRelease || config?.likeSponsorship?.authorization !== 'signed-like'
        || !config.likeSponsorship.enabled) throw new Error('Likes are temporarily unavailable. Please try again shortly.');
      await transact('like', [selected.id], '0');
    } catch (error) {
      if (currentAddress.current === actor) {
        if (error instanceof WalletActionPending) setLike(undefined);
        else { setLike(selected); setLikePhase(likeFailurePhase(error)); }
      }
      throw error;
    }
  }, 'Like sent.', { backgroundRefresh: true, transactionNotification: true });
  const continueLike = useRef(confirmLike);
  continueLike.current = confirmLike;
  useEffect(() => {
    const intent = likeAfterConnect.current;
    if (!actor || busy || !intent?.address) return;
    likeAfterConnect.current = undefined;
    if (intent.address === actor) continueLike.current(intent.short);
    else setLike(undefined);
  }, [actor, busy]);
  const visibleFeed = sharedId ? [sharedVideo].filter((item): item is Short => !!item)
    : rankShorts(feed, personal.preferences, topic, social.followed);
  return {
    actor,
    commentShort,
    setCommentShort,
    commentRevision,
    publishedComment,
    connectForComments: () => perform(async () => {
      setWalletPending(true);
      try { await connectWallet(); } finally { setWalletPending(false); }
    }, 'Wallet connected.', { backgroundRefresh: true }),
    addComment: (text: string) => perform(async () => {
      if (!commentShort || !actor) throw new Error('Connect your wallet to comment.');
      const author = await request<{ nextSequence: string }>(`/comments/authors/${encodeURIComponent(actor)}`);
      await transact('add_comment', [commentShort.id], '0', false, { text, sequence: author.nextSequence });
    }, 'Comment published.', { backgroundRefresh: true, transactionNotification: true }),
    paymentRelease,
    measurementSession,
    authenticated,
    restoringCreatorSession: !!actor && ((!config && !configError) || creatorConnecting || (connectionOnly && !authenticated && !creatorConnectionError)),
    configError,
    releaseError,
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
    notificationScope: creatorScope,
    uploadProgress,
    uploadMaxBytes,
    uploadLimitLabel,
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
      try {
        if (resumeStorageKey) {
          localStorage.removeItem(resumeStorageKey);
          localStorage.removeItem(uploadCreationKey(resumeStorageKey));
        }
      } catch { setMessage('Could not clear upload recovery. Allow browser storage and try again.'); setMessageTone('error'); return; }
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
      return perform(refresh, 'Account updated. Performance refresh requested.', { pending: 'Refreshing your Studio' });
    },
    clearMessage: () => setMessage(''),
    like,
    likePhase,
    startLike: (selected: Short) => (actor ? confirmLike(selected) : connectForLike(selected)),
    setLike: (value?: Short) => { setLike(value); if (value) setMessage(''); },
    confirmLike,
    claim: () => perform(async () => { await transact('claim', []); setClaimReview(false); }, 'Rewards claimed to your wallet.', { transactionNotification: true }),
    claimPrevious: () => perform(() => transact('claim', [], '0', true), 'Earlier rewards claimed to your wallet.', { transactionNotification: true }),
    claimReward: (contract: string) => perform(() => transact('claim', [], '0', contract), 'Earlier rewards claimed to your wallet.', { transactionNotification: true }),
    rescan: (id: string) => perform(() => request(`/${id}/scan`, {}, requireLogin()), 'Community-guidelines status updated.', { pending: 'Checking community guidelines' }),
    moderate: (id: string, approved: boolean, reason: string, reviewedTopic: string, visualConfirmed = false) => perform(
      () => request(`/review/${id}`, {
        approved, reason, topic: reviewedTopic, visualConfirmed,
      }, requireLogin()),
      approved ? 'Approved for the feed.' : 'Excluded from the feed.',
      { pending: 'Saving your review' },
    ),
    reviewClip: (id: string) => perform(async () => {
      const scope = creatorScope;
      const controller = new AbortController();
      previewRequest.current?.abort(); previewRequest.current = controller;
      try {
        const response = await fetch(`${SHORTS_API}/api/shorts/review-media/${encodeURIComponent(id)}`, {
          headers: { Authorization: `Bearer ${requireLogin()}` },
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]),
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('Preview unavailable. Sign in as the creator or operator.');
        if (!/^(video\/|application\/octet-stream)/i.test(response.headers.get('Content-Type') || '')) {
          throw new Error('The preview service didn’t return a video. Please try again.');
        }
        const media = await response.blob();
        controller.signal.throwIfAborted();
        if (currentCreatorScope.current !== scope) throw new Error('Wallet changed. Reopen your Short to preview it.');
        requireLogin();
        setPreview({ id, url: URL.createObjectURL(media) });
      } finally { if (previewRequest.current === controller) previewRequest.current = undefined; }
    }, 'Private review preview loaded.', { pending: 'Loading private preview' }),
    appeal: (id: string, explanation: string) => perform(() => request(`/${id}/appeal`, { message: explanation }, requireLogin()), 'Your request for another feed review has been submitted.', { pending: 'Submitting your review request' }),
    report: (id: string, reportId: string, reason: string, detail: string) => perform(async () => {
      await request(`/${id}/report`, { id: reportId, reason, detail });
      personal.update({ hidden: [...personal.preferences.hidden, id] });
    }, 'Report submitted. This Short is now hidden from your feed.', { pending: 'Submitting your report' }),
  };
}
