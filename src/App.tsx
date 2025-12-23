import React, { Suspense, useEffect, useRef } from "react";
import { useRoutes } from "react-router-dom";
import GlobalNewAccountEducation from "./components/GlobalNewAccountEducation";
import { CollectInvitationLinkCard } from "./features/trending/components/Invitation";
import ModalProvider from "./components/ModalProvider";
import { useAeSdk, useAccount, useWalletConnect } from "./hooks";
import { routes } from "./routes";
import "./styles/genz-components.scss";
import "./styles/mobile-optimizations.scss";
import "./styles/layout-variants.scss";
import AppHeader from "./components/layout/app-header";
import { useSuperheroChainNames } from "./hooks/useChainName";
import FeedbackButton from "./components/FeedbackButton";
import { LayoutVariantProvider } from "./contexts/LayoutVariantContext";

const CookiesDialog = React.lazy(
  () => import("./components/modals/CookiesDialog")
);
const TokenSelectModal = React.lazy(
  () => import("./components/modals/TokenSelect")
);
const ImageGallery = React.lazy(
  () => import("./components/modals/ImageGallery")
);
const AlertModal = React.lazy(() => import("./components/modals/AlertModal"));
const TransactionConfirmModal = React.lazy(
  () => import("./components/modals/TransactionConfirmModal")
);
const ConnectWalletModal = React.lazy(
  () => import("./components/modals/ConnectWalletModal")
);
const TipModal = React.lazy(
  () => import("./components/modals/TipModal")
);

export default function App() {
  useSuperheroChainNames();
  const { initSdk, sdkInitialized, activeAccount } = useAeSdk();
  const { loadAccountData } = useAccount();
  const { checkWalletConnection } = useWalletConnect();
  // Use a ref to store the latest loadAccountData to avoid dependency issues
  const loadAccountDataRef = useRef(loadAccountData);
  
  useEffect(() => {
    initSdk();
  }, []);

  useEffect(() => {
    if (sdkInitialized) {
      checkWalletConnection();
    }
  }, [sdkInitialized]);

  // Keep the ref updated with the latest loadAccountData function
  useEffect(() => {
    loadAccountDataRef.current = loadAccountData;
  }, [loadAccountData]);

  // setup intervals for periodic data refresh
  // Increased interval from 10s to 30s to reduce load
  // Pauses when window is not visible to save resources
  useEffect(() => {
    if (!activeAccount) return;
    // Note: Initial load is handled by useAccountBalances hook when account changes
    // This interval is just for periodic refreshes
    
    let interval: NodeJS.Timeout | null = null;
    
    const startInterval = () => {
      // Clear any existing interval
      if (interval) clearInterval(interval);
      
      // Only start interval if document is visible
      if (!document.hidden) {
        interval = setInterval(() => {
          // Double-check visibility before fetching
          if (!document.hidden) {
            loadAccountDataRef.current();
          }
        }, 30000); // Reduced frequency: 30s instead of 10s
      }
    };
    
    // Start interval initially
    startInterval();
    
    // Handle visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Pause when hidden
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
      } else {
        // Resume when visible, and immediately refresh
        loadAccountDataRef.current();
        startInterval();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeAccount]);

  return (
    <LayoutVariantProvider>
      <div className="app-container">
        
        <GlobalNewAccountEducation />
        <AppHeader />
        <div className="app-content">
          <CollectInvitationLinkCard />
        </div>
        <Suspense fallback={<div className="loading-fallback" />}>
          <ModalProvider
            registry={{
              "cookies-dialog": CookiesDialog,
              "token-select": TokenSelectModal,
              "image-gallery": ImageGallery,
              alert: AlertModal,
              "transaction-confirm": TransactionConfirmModal,
              "connect-wallet": ConnectWalletModal,
              "tip": TipModal,
            }}
          />
        </Suspense>
        <Suspense fallback={<div className="loading-fallback" />}>
          <div className="app-routes-container">{useRoutes(routes as any)}</div>
        </Suspense>
        <FeedbackButton />
      </div>
    </LayoutVariantProvider>
  );
}
