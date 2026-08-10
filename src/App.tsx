import React, {
  Suspense, useEffect, useRef,
} from 'react';
import { useNavigate, useRoutes } from 'react-router-dom';
import { useAtom } from 'jotai';
import GlobalNewAccountEducation from './components/GlobalNewAccountEducation';
import { CollectInvitationLinkCard } from './features/trending/components/Invitation';
import ModalProvider from './components/ModalProvider';
import {
  useAeSdk, useAccount, useIsMobile, useWalletConnect,
} from './hooks';
import { routes } from './routes';
import './styles/genz-components.scss';
import './styles/mobile-optimizations.scss';
import { AppHeader } from './components/layout/app-header';
import FeedbackButton from './components/FeedbackButton';
import { NotificationsProvider } from './features/notifications';
import { ChatProvider } from './features/chat/provider/chat.provider';
import {
  profileEditModalFlowAtom,
  profileEditModalOpenAtom,
  profileEditModalPendingAfterConnectAtom,
} from './atoms/profileEditModalAtom';
import ProfileEditModal from './components/modals/ProfileEditModal';
import { PwaInstallPrompt } from './components/PwaInstallPrompt';
import { PwaInstallFab, PwaInstallGuide } from './components/PwaInstallGuide';
import { usePwaInstall } from './hooks/usePwaInstall';

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
const SendModal = React.lazy(
  () => import('./components/modals/SendModal'),
);
const ReceiveModal = React.lazy(
  () => import('./components/modals/ReceiveModal'),
);

const App = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { initSdk, activeAccount, sdkInitialized } = useAeSdk();
  const { canPrompt, promptInstall, isIOS } = usePwaInstall();
  const [installGuideOpen, setInstallGuideOpen] = React.useState(false);
  const { loadAccountData } = useAccount();
  const {
    attemptReconnection,
    walletInfo,
    connectingWallet,
    walletConnected,
  } = useWalletConnect();
  const [profileEditOpen, setProfileEditOpen] = useAtom(profileEditModalOpenAtom);
  const [profileEditFlow, setProfileEditFlow] = useAtom(profileEditModalFlowAtom);
  const [profileEditPendingAfterConnect, setProfileEditPendingAfterConnect] = useAtom(
    profileEditModalPendingAfterConnectAtom,
  );

  // Track if we've already initialized to prevent multiple calls
  const hasInitializedRef = useRef(false);
  const loadAccountDataRef = useRef(loadAccountData);

  // Keep refs updated with latest functions
  useEffect(() => {
    loadAccountDataRef.current = loadAccountData;
  }, [loadAccountData]);

  // Initialize SDK once on mount
  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    initSdk();
  }, [initSdk]);

  // Re-establish the extension connection for a persisted wallet session, so the
  // SDK's onAddressChange keeps firing after a page refresh. attemptReconnection
  // no-ops until persisted state is present and only ever attempts once.
  // connectingWallet/walletConnected are deps so an attempt skipped because a
  // connect was in flight is retried once that connect settles.
  useEffect(() => {
    if (!sdkInitialized) return;
    attemptReconnection();
  }, [
    sdkInitialized,
    activeAccount,
    walletInfo,
    connectingWallet,
    walletConnected,
    attemptReconnection,
  ]);

  // Setup interval for periodic data refresh when account is active
  useEffect(() => {
    if (!activeAccount) return undefined;

    // Load data immediately
    loadAccountDataRef.current();

    // Then set up periodic refresh (wallet reconnection is handled in useWalletConnect).
    // Skip refreshes while the tab is hidden — a background tab doesn't need
    // account data updated every 10s.
    const interval = setInterval(() => {
      if (document.hidden) return;
      loadAccountDataRef.current();
    }, 10000);

    // The interval skips ticks while hidden, so refresh once immediately when
    // the tab becomes visible again — otherwise account/wallet UI can show data
    // that hasn't been refreshed since the last visible poll for up to 10s.
    const handleVisibilityChange = () => {
      if (!document.hidden) loadAccountDataRef.current();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeAccount]);

  useEffect(() => {
    if (!profileEditPendingAfterConnect || !activeAccount) return;
    setProfileEditPendingAfterConnect(false);
    setProfileEditOpen(true);
  }, [
    activeAccount,
    profileEditPendingAfterConnect,
    setProfileEditOpen,
    setProfileEditPendingAfterConnect,
  ]);

  const resetProfileEditFlow = () => setProfileEditFlow({
    redirectToProfileOnClose: false,
    showSkip: false,
  });

  const handleProfileEditSuccess = () => {
    setProfileEditOpen(false);
    if (profileEditFlow.redirectToProfileOnClose && activeAccount) {
      navigate(`/users/${encodeURIComponent(activeAccount)}`);
    }
    resetProfileEditFlow();
  };

  const handleProfileEditDismiss = () => {
    setProfileEditOpen(false);
    resetProfileEditFlow();
  };

  return (
    <NotificationsProvider>
      {/* Mounted above the router so the relay pool survives route changes. */}
      <ChatProvider>
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
                send: SendModal,
                receive: ReceiveModal,
              }}
            />
          </Suspense>
          <ProfileEditModal
            open={profileEditOpen}
            onClose={(updatedProfile) => {
              if (updatedProfile) handleProfileEditSuccess();
              else handleProfileEditDismiss();
            }}
          // Hide the dialog while a save runs (or when it's dismissed mid-save), keeping the
          // flow flags (e.g. the post-onboarding redirect) intact — onClose(updated) settles
          // them on success. No onSaveError handler on purpose: a failed save is not a
          // cancel, so the flags survive and the flow can resume when the user retries.
            onHide={() => setProfileEditOpen(false)}
            showSkip={profileEditFlow.showSkip}
            onSkip={handleProfileEditDismiss}
            onClaimSuccess={
            profileEditFlow.redirectToProfileOnClose ? handleProfileEditSuccess : undefined
          }
          />
          <Suspense fallback={<div className="loading-fallback" />}>
            <div className="app-routes-container">{useRoutes(routes as any)}</div>
          </Suspense>
          {/* TODO: Disable feedback button on mobile for now */}
          {!isMobile && <FeedbackButton />}
          {/* PWA install prompt - floating bottom-right, above bottom nav */}
          <PwaInstallPrompt />
          {/* Mobile FAB — shown on iOS (no native prompt) or when native prompt unavailable */}
          {isMobile && (isIOS || !canPrompt) && (
            <PwaInstallFab
              canNativePrompt={canPrompt}
              onNativePrompt={promptInstall}
              onOpenGuide={() => setInstallGuideOpen(true)}
            />
          )}
          <PwaInstallGuide
            open={installGuideOpen}
            onOpenChange={setInstallGuideOpen}
          />
        </div>
      </ChatProvider>
    </NotificationsProvider>
  );
};

export default App;
