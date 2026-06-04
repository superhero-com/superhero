import React, {
  Suspense, useEffect, useRef,
} from 'react';
import { useRoutes } from 'react-router-dom';
import GlobalNewAccountEducation from './components/GlobalNewAccountEducation';
import { CollectInvitationLinkCard } from './features/trending/components/Invitation';
import ModalProvider from './components/ModalProvider';
import {
  useAeSdk, useAccount, useIsMobile, useModal, useWalletConnect,
} from './hooks';
import { routes } from './routes';
import './styles/genz-components.scss';
import './styles/mobile-optimizations.scss';
import { AppHeader } from './components/layout/app-header';
import FeedbackButton from './components/FeedbackButton';
import { hasCompletedOnboarding } from './components/modals/WelcomeModal';

const CookiesDialog = React.lazy(
  () => import('./components/modals/CookiesDialog'),
);
const TokenSelectModal = React.lazy(
  () => import('./components/modals/TokenSelect'),
);
const ImageGallery = React.lazy(
  () => import('./components/modals/ImageGallery'),
);
const AlertModal = React.lazy(() => import('./components/modals/AlertModal'));
const TransactionConfirmModal = React.lazy(
  () => import('./components/modals/TransactionConfirmModal'),
);
const ConnectWalletModal = React.lazy(
  () => import('./components/modals/ConnectWalletModal'),
);
const TipModal = React.lazy(
  () => import('./components/modals/TipModal'),
);
const OnboardingModal = React.lazy(
  () => import('./components/modals/OnboardingModal'),
);
const WelcomeModal = React.lazy(
  () => import('./components/modals/WelcomeModal'),
);

const App = () => {
  const isMobile = useIsMobile();
  const { initSdk, activeAccount } = useAeSdk();
  const { loadAccountData } = useAccount();
  const { attemptReconnection } = useWalletConnect();
  const { openModal } = useModal();

  // Track if we've already initialized to prevent multiple calls
  const hasInitializedRef = useRef(false);
  const loadAccountDataRef = useRef(loadAccountData);
  const welcomeShownRef = useRef(false);

  // Keep refs updated with latest functions
  useEffect(() => {
    loadAccountDataRef.current = loadAccountData;
  }, [loadAccountData]);

  // Initialize SDK once on mount
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const initialize = async () => {
      await initSdk();
      // attemptReconnection will check if there's persisted wallet state and try to reconnect
      await attemptReconnection();
    };

    initialize();
  }, [attemptReconnection, initSdk]); // Run once per stable hook references

  // Show welcome modal for first-time visitors (not logged in, onboarding not skipped)
  useEffect(() => {
    if (welcomeShownRef.current) return undefined;
    if (activeAccount) return undefined; // Already logged in, skip
    if (hasCompletedOnboarding()) return undefined; // Already seen
    welcomeShownRef.current = true;
    // Small delay to let the app render first
    const timer = setTimeout(() => {
      openModal({ name: 'welcome' });
    }, 500);
    return () => clearTimeout(timer);
  }, [activeAccount, openModal]);

  // Setup interval for periodic data refresh when account is active
  useEffect(() => {
    if (!activeAccount) return undefined;

    // Load data immediately
    loadAccountDataRef.current();

    // Then set up periodic refresh (wallet reconnection is handled in useWalletConnect)
    const interval = setInterval(() => {
      loadAccountDataRef.current();
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [activeAccount]);

  return (
    <div className="app-container">

      <GlobalNewAccountEducation />
      <AppHeader />
      <div className="app-content">
        <CollectInvitationLinkCard />
      </div>
      <Suspense fallback={<div className="loading-fallback" />}>
        <ModalProvider
          registry={{
            'cookies-dialog': CookiesDialog,
            'token-select': TokenSelectModal,
            'image-gallery': ImageGallery,
            alert: AlertModal,
            'transaction-confirm': TransactionConfirmModal,
            'connect-wallet': ConnectWalletModal,
            tip: TipModal,
            onboarding: OnboardingModal,
            welcome: WelcomeModal,
          }}
        />
      </Suspense>
      <Suspense fallback={<div className="loading-fallback" />}>
        <div className="app-routes-container">{useRoutes(routes as any)}</div>
      </Suspense>
      {/* TODO: Disable feedback button on mobile for now */}
      {!isMobile && <FeedbackButton />}
    </div>
  );
};

export default App;
