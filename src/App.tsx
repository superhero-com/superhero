import React, { Suspense, useEffect, useRef } from "react";
import { useRoutes } from "react-router-dom";
import GlobalNewAccountEducation from "./components/GlobalNewAccountEducation";
import { CollectInvitationLinkCard } from "./features/trending/components/Invitation";
import ModalProvider from "./components/ModalProvider";
import { useAeSdk, useAccount, useWalletConnect } from "./hooks";
import { routes } from "./routes";
import "./styles/genz-components.scss";
import "./styles/mobile-optimizations.scss";
import AppHeader from "./components/layout/app-header";
import { useSuperheroChainNames } from "./hooks/useChainName";

const CookiesDialog = React.lazy(
  () => import("./components/modals/CookiesDialog")
);
const TokenSelectModal = React.lazy(
  () => import("./components/modals/TokenSelect")
);
const ImageGallery = React.lazy(
  () => import("./components/modals/ImageGallery")
);
const FeedItemMenu = React.lazy(
  () => import("./components/modals/FeedItemMenu")
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
  useEffect(() => {
    if (!activeAccount) return;
    // Note: Initial load is handled by useAccountBalances hook when account changes
    // This interval is just for periodic refreshes
    const interval = setInterval(() => {
      loadAccountDataRef.current();
    }, 10000);
    return () => clearInterval(interval);
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
            "cookies-dialog": CookiesDialog,
            "token-select": TokenSelectModal,
            "image-gallery": ImageGallery,
            "feed-item-menu": FeedItemMenu,
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
    </div>
  );
}
