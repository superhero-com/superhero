import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAtom } from 'jotai';
import { useModal } from '@/hooks/useModal';
import { Contract } from '@aeternity/aepp-sdk';
import { useAeSdk } from '@/hooks/useAeSdk';
import { useWalletConnect } from '@/hooks/useWalletConnect';
import { CONFIG } from '@/config';
import { creatorSessionAtom, openConnectedCreatorSession, type CreatorLogin } from './shorts-wallet-session';
import { useShortsPreferences, rankShorts } from './shorts-preferences';
import { PlaybackDelivery, type PlaybackResult } from './shorts-playback';
import { useShortsSocial } from './use-shorts-social';
import { request, SHORTS_API, ShortsApiError } from './api';
import type {
  Config, Dashboard, Review, Short, Performance, UploadDraft,
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
  const [days, setDays] = useState(28);
  const [performance, setPerformance] = useState<Performance>();
  const [performanceError, setPerformanceError] = useState('');
  const [performanceRevision, setPerformanceRevision] = useState(0);
  const performanceScope = useRef('');
  const [claimReview, setClaimReview] = useState(false);
  const videoId = section === 'video' ? location.pathname.split('/')[4] : undefined;
  const [topic, setTopic] = useState('All');
  const [config, setConfig] = useState<Config>();
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
  const sharedId = tab === 'feed' ? new URLSearchParams(location.search).get('short') : null;
  const [sharedResult, setSharedResult] = useState<{ id: string; video?: Short }>();
  const sharedVideo = sharedResult?.id === sharedId ? sharedResult.video : undefined;
  const social = useShortsSocial(sharedVideo ? [sharedVideo, ...feed.filter((item) => item.id !== sharedVideo.id)] : feed, actor);
  const currentFeed = useRef(feed);
  currentFeed.current = feed;
  // Briefly bridge node/API lag after a mined Like; canonical reads then take over.
  const confirmedLikes = useRef(new Map<string, { count: number; until: number }>());
  const [dashboard, setDashboard] = useState<Dashboard>();
  const [dashboardError, setDashboardError] = useState('');
  const [review, setReview] = useState<Review[]>([]);
  const [preview, setPreview] = useState<{ id: string; url: string }>();
  const [busy, setBusy] = useState(false);
  const [uploadDraft, setUploadDraft] = useState<UploadDraft>();
  const [uploadEpoch, setUploadEpoch] = useState(0);
  const [preparedUpload, setPreparedUpload] = useState<{ video: Short; key: string }>();
  const [uploadPublication, setUploadPublication] = useState<{ shortId?: string; status: 'uploading' | 'publishing' | 'published' | 'error' }>();
  const [uploadProgress, setUploadProgress] = useState<number>();
  const [uploadStage, setUploadStage] = useState<'checking' | 'uploading' | 'processing'>();
  const [walletPending, setWalletPending] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'info' | 'success' | 'error'>('info');
  const setTab = (value: string) => {
    setMessage('');
    navigate({ feed: '/shorts', publish: '/shorts/studio/upload', review: '/shorts/studio/review' }[value] || '/shorts/studio');
  };
  const [like, setLike] = useState<Short>();
  const likeAfterConnect = useRef<Short | undefined>(undefined);
  const [withdrawal, setWithdrawal] = useState<Short>();
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
    setWithdrawal(undefined);
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
      const [c, f, shared] = await Promise.all([
        request<Config>('/config'),
        request<Short[]>(`?address=${encodeURIComponent(actor)}&topic=${encodeURIComponent(topic)}`),
        sharedId ? request<Short>(`/shared/${encodeURIComponent(sharedId)}?address=${encodeURIComponent(actor)}`).catch(() => undefined) : undefined,
      ]);
      let d: Dashboard | undefined;
      let r: Review[] = [];
      try {
        d = token ? await request<Dashboard>('/dashboard', undefined, token) : undefined;
        r = token && actor === c.operator && login?.kind !== 'connected-wallet' ? await request<Review[]>('/review', undefined, token) : [];
      } catch (error) {
        if (error instanceof ShortsApiError && error.status === 401) {
          setLogin((current) => (current?.token === token ? undefined : current));
          if (c.creatorAccess === 'connected-wallet') setCreatorConnectionError('Studio couldn’t load your account. Please try again.');
        }
        throw error;
      }
      if (gen !== generation.current) return;
      setConfig(c);
      const withConfirmedLike = (item: Short) => {
        const confirmed = confirmedLikes.current.get(item.id);
        if (!confirmed) return item;
        if (Date.now() >= confirmed.until || (item.liked && item.likes >= confirmed.count)) {
          confirmedLikes.current.delete(item.id);
          return item;
        }
        return { ...item, likes: Math.max(item.likes, confirmed.count), liked: true };
      };
      setFeed(f.map(withConfirmedLike));
      setSharedResult(sharedId ? { id: sharedId, video: shared ? withConfirmedLike(shared) : undefined } : undefined);
      setDashboard(d); setReview(r); setDashboardError('');
    } catch (error) {
      if (gen === generation.current && currentAddress.current === actor && token) {
        setDashboardError('Your account couldn’t be updated. Check your connection and try again.');
      }
      throw error;
    }
  }, [actor, topic, token, sharedId, setLogin, login?.kind]);
  useEffect(() => {
    const counter = generation;
    refresh().catch((e) => setMessage(e.message));
    const timer = setInterval(() => refresh().catch(() => undefined), 20000);
    return () => { clearInterval(timer); counter.current += 1; };
  }, [refresh]);
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
    const timer = setInterval(load, 20000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [days, token, tab, videoId, performanceRevision]);
  const measuredSession = useRef('');
  const delivery = useRef<PlaybackDelivery | undefined>(undefined);
  const getDelivery = useCallback(() => {
    if (delivery.current) return delivery.current;
    const sender = new PlaybackDelivery(
      (id, payload) => request<PlaybackResult>(`/${id}/playback`, payload, undefined, { keepalive: true, timeout: 10000 }),
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
  const getMeasuredSession = () => {
    if (!measuredSession.current) {
      try { measuredSession.current = localStorage.getItem('shorts.measurement.session') || crypto.randomUUID(); localStorage.setItem('shorts.measurement.session', measuredSession.current); } catch { measuredSession.current = crypto.randomUUID(); }
    }
    return measuredSession.current;
  };
  const playback = useCallback((id: string, _event: string, seconds: number) => {
    if (!_event) return;
    getDelivery().enqueue(id, {
      id: `${getMeasuredSession().slice(0, 20)}-${id}-${new Date().toISOString().slice(0, 10)}`, seconds: Math.min(60, seconds), session: getMeasuredSession(), source: new URLSearchParams(location.search).has('short') ? 'shared' : personal.preferences.mode,
    });
  }, [personal.preferences.mode, location.search, getDelivery]);
  const perform = async (fn: () => Promise<unknown>, success: string, backgroundRefresh = false) => {
    if (actionLock.current) return false;
    actionLock.current = true; setBusy(true); setMessage(''); setMessageTone('info');
    try {
      await fn();
      if (currentAddress.current !== actor) return true;
      setMessageTone('success');
      setMessage(success);
      // A refresh failure must not turn a confirmed payment into a retry prompt.
      const updating = refresh().catch(() => {
        if (currentAddress.current === actor) setMessage(`${success} Refresh to see the latest state.`);
      });
      if (!backgroundRefresh) await updating;
      return true;
    } catch (e) {
      if (currentAddress.current !== actor) return false;
      if (e instanceof ShortsApiError && e.status === 401) { setLogin(undefined); setDashboard(undefined); setReview([]); }
      setMessageTone('error');
      const detail = e instanceof Error ? e.message : 'Please try again.';
      setMessage(/user rejected|rejected by user|request rejected|cancelled|canceled|user denied/i.test(detail) ? 'Cancelled in your wallet. No payment was submitted. You can try again when ready.' : detail);
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
    if (CONFIG.NETWORK !== 'ae_uat' || config?.network !== 'ae_uat'
      || (await sdk.getNodeInfo()).nodeNetworkId !== 'ae_uat') {
      throw new Error('Switch your wallet to æternity testnet before continuing.');
    }
    if (!actor || currentAddress.current !== actor) throw new Error('Wallet changed. Reconnect and try again.');
  };
  const transact = async (method: string, args: unknown[], amount?: string, onConfirmed?: () => void, previous = false) => {
    // The wallet-signed contract call authorizes every on-chain action.
    const auth = token;
    setWalletPending(true);
    try {
      await checkNetwork();
      const contract = await Contract.initialize({
        ...sdk.getContext(), aci: (previous ? config!.previousAci : config!.aci) as any, address: (previous ? config!.previousContract : config!.contract) as `ct_${string}`,
      });
      if (sdk.address !== actor || currentAddress.current !== actor) throw new Error('Wallet signer does not match the connected account.');
      setMessage('Review the testnet transaction in your wallet…');
      const result = await contract.$call(method, args, amount ? { amount } : {});
      setMessage(`Transaction confirmed: ${result.hash}`);
      onConfirmed?.();
      // This private receipt list is optional. Public Likes and creator revenue
      // are independently indexed from verified contract state/events by the API.
      const recording = auth
        ? request('/receipt', { tx: result.hash }, auth).catch(() => undefined)
        : Promise.resolve();
      // Like feedback uses the mined result, independent of receipt/API latency.
      if (!onConfirmed) await recording;
      return result;
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
      if (currentAddress.current !== actor || next.address !== actor) throw new Error('Wallet changed during verification.');
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
    const auth = token ? requireLogin() : await ensureCreatorSession();
    const hash = async (bytes: ArrayBuffer) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((v) => v.toString(16).padStart(2, '0')).join('');
    setUploadProgress(0); setUploadStage('checking');
    const details = {
      description: String(data.get('description') || ''), language: String(data.get('language') || 'und'), captions: String(data.get('captions') || ''), synthetic: data.get('synthetic') === 'true', sponsored: data.get('sponsored') === 'true',
    };
    const metadata = {
      title: String(data.get('title')), topic: String(data.get('topic')), rights: data.get('rights') === 'true', bytes: file.size, sha256: await hash(await file.arrayBuffer()), details,
    };
    const fingerprint = await hash(new TextEncoder().encode(JSON.stringify(metadata)).buffer);
    const storageKey = `shorts.upload.${actor}`;
    type UploadSession = { id: string; parts: number[]; partSize: number; expires: number; complete: boolean };
    let resume: UploadSession | undefined;
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
      if (saved.fingerprint === fingerprint && saved.expires > Date.now()) resume = await request<UploadSession>(`/uploads/${saved.id}`, undefined, auth);
    } catch { /* A missing/expired upload session can be replaced. */ }
    if (!resume) resume = await request<UploadSession>('/uploads', metadata, auth);
    try { localStorage.setItem(storageKey, JSON.stringify({ id: resume.id, expires: resume.expires, fingerprint })); } catch { /* Uploading still works without persisted resume. */ }
    const count = Math.ceil(file.size / resume.partSize);
    setUploadStage('uploading');
    for (let i = 0; i < count && !resume.complete; i += 1) {
      if (!resume.parts.includes(i)) {
        const part = new FormData(); part.set('file', file.slice(i * resume.partSize, (i + 1) * resume.partSize), 'part');
        // Parts are sequential so retries never race over a partially received file.
        // eslint-disable-next-line no-await-in-loop
        await request(`/uploads/${resume.id}/parts/${i}`, part, requireLogin());
      }
      setUploadProgress(Math.round(((i + 1) / count) * 100));
    }
    setUploadStage('processing');
    setMessage('Upload received. Preparing your video for playback…');
    const prepared = await request<Short>(`/uploads/${resume.id}/finish`, {}, requireLogin());
    requireLogin();
    setPreparedUpload({ video: prepared, key });
    setUploadProgress(undefined); setUploadStage(undefined);
    return prepared;
  };
  const publishUpload = (data: FormData, key: string) => perform(async () => {
    if (uploadPublication?.status === 'published') return;
    let short = preparedUpload?.key === key ? preparedUpload.video : undefined;
    setUploadPublication({ shortId: short?.id, status: short ? 'publishing' : 'uploading' });
    try {
      if (!short) short = await prepareUpload(data, key);
      requireLogin();
      setUploadPublication({ shortId: short.id, status: 'publishing' });
      const published = await request<Short>(`/${short.id}/publish`, {}, requireLogin());
      requireLogin();
      setPreparedUpload({ video: published, key });
      setUploadPublication({ shortId: short.id, status: 'published' });
      try { localStorage.removeItem(`shorts.upload.${actor}`); } catch { /* Session-only storage. */ }
    } catch (error) {
      if (currentAddress.current === actor) setUploadPublication({ shortId: short?.id, status: 'error' });
      throw error;
    } finally { setUploadStage(undefined); setUploadProgress(undefined); }
  }, 'Your Short is published.', true);
  const publish = (id: string) => perform(() => request(`/${id}/publish`, {}, requireLogin()), 'Your Short is published.');
  const confirmLike = () => perform(async () => {
    if (!like) throw new Error('Choose a Short to Like.');
    if (like.creator === actor) throw new Error('You cannot send a paid Like to your own Short.');
    if (like.liked || currentFeed.current.find((item) => item.id === like.id)?.liked) {
      throw new Error('You already liked this Short.');
    }
    const selected = like;
    await transact('paid_like', [selected.id], '100000000000000000', () => {
      if (currentAddress.current !== actor) return;
      const latest = currentFeed.current.find((item) => item.id === selected.id) || selected;
      const count = Math.max(selected.likes + 1, latest.likes + (latest.liked ? 0 : 1));
      confirmedLikes.current.set(selected.id, { count, until: Date.now() + 120000 });
      // Discard any feed read started before this confirmation.
      generation.current += 1;
      setFeed((items) => items.map((item) => (item.id === selected.id
        ? { ...item, likes: count, liked: true } : item)));
      setSharedResult((current) => (current?.video?.id === selected.id
        ? { ...current, video: { ...current.video, likes: count, liked: true } } : current));
      setLike(undefined);
    });
  }, 'Like sent. Thanks for supporting this creator!', true);
  const visibleFeed = sharedId ? [sharedVideo].filter((item): item is Short => !!item)
    : rankShorts(feed, personal.preferences, topic, social.followed);
  return {
    actor,
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
    feedReady: !!config && (!sharedId || sharedResult?.id === sharedId),
    shared: !!sharedId,
    dashboard,
    review,
    preview,
    busy,
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
    withdrawal,
    setWithdrawal: (value?: Short) => { setWithdrawal(value); if (value) setMessage(''); },
    confirmLike,
    claim: () => perform(async () => { await transact('claim', []); setClaimReview(false); }, 'Rewards claimed to your testnet wallet.'),
    claimPrevious: () => perform(() => transact('claim', [], undefined, undefined, true), 'Earlier rewards claimed to your testnet wallet.'),
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
    withdraw: (id: string) => perform(async () => {
      await transact('withdraw', [id]);
      setWithdrawal(undefined);
    }, 'Short permanently withdrawn from official playback.'),
    appeal: (id: string, explanation: string) => perform(() => request(`/${id}/appeal`, { message: explanation }, requireLogin()), 'Your request for another feed review has been submitted.'),
    report: (id: string, reportId: string, reason: string, detail: string) => perform(async () => {
      await request(`/${id}/report`, { id: reportId, reason, detail });
      personal.update({ hidden: [...personal.preferences.hidden, id] });
    }, 'Report submitted. This Short is now hidden from your feed.'),
  };
}
