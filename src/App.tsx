import React, { Suspense, useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import GlobalNewAccountEducation from './components/GlobalNewAccountEducation';
import CollectInvitationLinkCard from './components/Invitation/CollectInvitationLinkCard';
import AppHeader from './components/layout/app-header';
import ModalProvider from './components/ModalProvider';
import { useAeSdk, useWalletConnect } from './hooks';
import { routes } from './routes';
import './styles/genz-components.scss';
import './styles/mobile-optimizations.scss';
const PostModal = React.lazy(() => import('./components/modals/PostModal'));
const CookiesDialog = React.lazy(() => import('./components/modals/CookiesDialog'));
const TokenSelectModal = React.lazy(() => import('./components/modals/TokenSelect'));
const ImageGallery = React.lazy(() => import('./components/modals/ImageGallery'));
const FeedItemMenu = React.lazy(() => import('./components/modals/FeedItemMenu'));
const AlertModal = React.lazy(() => import('./components/modals/AlertModal'));
const TransactionConfirmModal = React.lazy(() => import('./components/modals/TransactionConfirmModal'));


export default function App() {
  const { initSdk, sdkInitialized } = useAeSdk();
  const { checkWalletConnection } = useWalletConnect();
  useEffect(() => {
    initSdk();
  }, []);

  useEffect(() => {
    if (sdkInitialized) {
      checkWalletConnection();
    }
  }, [sdkInitialized]);

  if (!sdkInitialized) {
    return <div className="loading-fallback" />;
  }


  return (
    <div className="app-container">
      <AppHeader />
      <div className="app-content">
        <CollectInvitationLinkCard />
      </div>
      <GlobalNewAccountEducation />
      <Suspense fallback={<div className="loading-fallback" />}>
        <ModalProvider registry={{ 'post': PostModal, 'cookies-dialog': CookiesDialog, 'token-select': TokenSelectModal, 'image-gallery': ImageGallery, 'feed-item-menu': FeedItemMenu, 'alert': AlertModal, 'transaction-confirm': TransactionConfirmModal }} />
      </Suspense>
      <Suspense fallback={<div className="loading-fallback" />}>
        <div className="app-routes-container">
          <Routes future={{ v7_startTransition: true, v7_relativeSplatPath: true } as any}>
            {routes.map((r) => (
              <Route key={r.path as string} path={r.path as string} element={r.element} />
            ))}
          </Routes>
        </div>
      </Suspense>
    </div>
  );
}


