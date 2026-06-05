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
import { useProfileFeed } from './hooks/useProfileFeed';
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

/**
 * Whether a wallet session was persisted before this app load. Returning users have one;
 * wallet reconnection transiently clears the in-memory activeAccount/walletInfo, so we read
 * the raw persisted keys to tell a returning user apart from a genuine first-time visitor.
 */
function hasPersistedWalletSession(): boolean {
  try {
    const isSet = (value: string | null) => (
      value !== null && value !== 'null' && value !== 'undefined' && value !== '""'
    );
    return isSet(localStorage.getItem('account:activeAccount'))
      || isSet(localStorage.getItem('wallet:walletInfo'));
  } catch {
    return false;
  }
}

const App = () => {
  const isMobile = useIsMobile();
  useProfileFeed({ refetchIntervalMs: 20_000 });
  const { initSdk, activeAccount } = useAeSdk();
  const { loadAccountData } = useAccount();
  const { attemptReconnection, connectingWallet } = useWalletConnect();
  const { openModal } = useModal();

  // Track if we've already initialized to prevent multiple calls
  const hasInitializedRef = useRef(false);
  const loadAccountDataRef = useRef(loadAccountData);

  // Capture the persisted-session state on the first render, before reconnection runs and
  // clears activeAccount/walletInfo. Used to keep the first-visit welcome from popping over a
  // returning user mid-reconnect.
  const hadPersistedWalletSessionRef = useRef<boolean | null>(null);
  if (hadPersistedWalletSessionRef.current === null) {
    hadPersistedWalletSessionRef.current = hasPersistedWalletSession();
  }
  const welcomeOpenedRef = useRef(false);

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

  // Show welcome modal for first-time visitors only. Skip it for returning users — including
  // the window while wallet reconnection is in progress, during which connectWallet() has
  // transiently cleared activeAccount/walletInfo before the connection completes.
  useEffect(() => {
    if (welcomeOpenedRef.current) return undefined; // Already opened once this session
    if (hasCompletedOnboarding()) return undefined; // Already seen
    // Returning user, possibly mid-reconnect
    if (hadPersistedWalletSessionRef.current) return undefined;
    if (activeAccount) return undefined; // Already logged in
    if (connectingWallet) return undefined; // Connection/reconnection in progress
    // Small delay to let the app render first
    const timer = setTimeout(() => {
      welcomeOpenedRef.current = true;
      openModal({ name: 'welcome' });
    }, 500);
    return () => clearTimeout(timer);
  }, [activeAccount, connectingWallet, openModal]);

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
