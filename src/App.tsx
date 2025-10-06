import React, { Suspense, useEffect } from "react";
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
const PostModal = React.lazy(() => import("./components/modals/PostModal"));
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

export default function App() {
  useSuperheroChainNames();
  const { initSdk, sdkInitialized, activeAccount } = useAeSdk();
  const { loadAccountData } = useAccount();
  const { checkWalletConnection } = useWalletConnect();
  useEffect(() => {
    initSdk();
  }, []);

  useEffect(() => {
    if (sdkInitialized) {
      checkWalletConnection();
    }
  }, [sdkInitialized]);

  // setup intervals
  useEffect(() => {
    if (!activeAccount) return;
    loadAccountData();
    const interval = setInterval(() => {
      loadAccountData();
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
            post: PostModal,
            "cookies-dialog": CookiesDialog,
            "token-select": TokenSelectModal,
            "image-gallery": ImageGallery,
            "feed-item-menu": FeedItemMenu,
            alert: AlertModal,
            "transaction-confirm": TransactionConfirmModal,
            "connect-wallet": ConnectWalletModal,
          }}
        />
      </Suspense>
      <Suspense fallback={<div className="loading-fallback" />}>
        <div className="app-routes-container">{useRoutes(routes as any)}</div>
      </Suspense>
    </div>
  );
}
