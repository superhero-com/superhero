import React, { useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { initSdk } from './store/slices/aeternitySlice';
import type { RootState, AppDispatch } from './store/store';
import { Backend } from './api/backend';
import {
  setAddress,
  setChainNames,
  setGraylistedUrls,
  setTokenInfo,
  setVerifiedUrls,
  setWordRegistry,
} from './store/slices/rootSlice';
import { setPrices, setStats } from './store/slices/backendSlice';
import { Suspense } from 'react';
import { routes } from './routes';
import { consumeAuthCallback } from './auth/deeplink';
import TopNav from './components/layout/TopNav';
import CollectInvitationLinkCard from './components/Invitation/CollectInvitationLinkCard';
import MobileNavigation from './components/layout/MobileNavigation';
import ModalProvider from './components/ModalProvider';
import GlobalNewAccountEducation from './components/GlobalNewAccountEducation';
import './styles/mobile-optimizations.scss';
import './styles/genz-components.scss';
const PostModal = React.lazy(() => import('./components/modals/PostModal'));
const CookiesDialog = React.lazy(() => import('./components/modals/CookiesDialog'));
const TokenSelectModal = React.lazy(() => import('./components/modals/TokenSelect'));
const ImageGallery = React.lazy(() => import('./components/modals/ImageGallery'));
const FeedItemMenu = React.lazy(() => import('./components/modals/FeedItemMenu'));
const AlertModal = React.lazy(() => import('./components/modals/AlertModal'));

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function useInit() {
  const dispatch = useDispatch<AppDispatch>();
  const address = useSelector((s: RootState) => s.root.address);
  const navigate = useNavigate();
  const query = useQuery();
  const didInitRef = React.useRef(false);

  useEffect(() => {
    if (didInitRef.current) return; // guard StrictMode double invoke in dev
    didInitRef.current = true;
    // on mount: init SDK and data
    dispatch(initSdk()).then(async () => {
      const addressParam = query.get('address');
      if (addressParam) dispatch(setAddress(addressParam));
      await reloadData();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function reloadData() {
    const [chainNames, verifiedUrls, graylistedUrls, tokenInfo, /* wordRegistry */ , price, stats] = await Promise.all([
      Backend.getCacheChainNames(),
      Backend.getVerifiedUrls(),
      Backend.getGrayListedUrls(),
      Backend.getTokenInfo(),
      Promise.resolve([]),
      Backend.getPrice(),
      Backend.getTipStats(),
    ]);
    dispatch(setChainNames(chainNames));
    dispatch(setGraylistedUrls(graylistedUrls));
    dispatch(setVerifiedUrls(verifiedUrls));
    dispatch(setTokenInfo(tokenInfo || {}));
    dispatch(setWordRegistry([]));
    dispatch(setPrices(price.aeternity));
    dispatch(setStats(stats));
  }

  useEffect(() => {
    const id = window.setInterval(() => { reloadData().catch(() => {}); }, 120 * 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // optional landing redirect parity (not implemented here)
    void address; void navigate;
  }, [address, navigate]);

  useEffect(() => {
    consumeAuthCallback();
  }, []);
}

export default function App() {
  useInit();
  return (
    <div className="app-container">
      <TopNav />
      <div className="app-content">
        <CollectInvitationLinkCard />
      </div>
      <MobileNavigation />
      <GlobalNewAccountEducation />
      <Suspense fallback={<div className="loading-fallback" />}>
        <ModalProvider registry={{ 'post': PostModal, 'cookies-dialog': CookiesDialog, 'token-select': TokenSelectModal, 'image-gallery': ImageGallery, 'feed-item-menu': FeedItemMenu, 'alert': AlertModal }} />
      </Suspense>
      <Suspense fallback={<div className="loading-fallback" />}> 
        {/* @ts-expect-error: using RRv6 future flags not yet in Types */}
        <Routes future={{ v7_startTransition: true, v7_relativeSplatPath: true } as any}>
          {routes.map((r) => (
            <Route key={r.path as string} path={r.path as string} element={r.element} />
          ))}
        </Routes>
      </Suspense>
    </div>
  );
}


