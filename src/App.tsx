import React, { Suspense, useEffect, useRef, useState } from "react";
import { useRoutes } from "react-router-dom";
import GlobalNewAccountEducation from "./components/GlobalNewAccountEducation";
import { CollectInvitationLinkCard } from "./features/trending/components/Invitation";
import ModalProvider from "./components/ModalProvider";
import { useAeSdk, useAccount, useWalletConnect } from "./hooks";
import { getRoutes } from "./routes";
import { PluginHostProvider, usePluginHostCtx } from "./features/social/plugins/PluginHostProvider";
import { loadExternalPlugins } from "./features/social/plugins/loader";
import { loadLocalPlugins } from "@/plugins/local";
import { CONFIG } from "./config";
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

function PluginBootstrap({ children }: { children: React.ReactNode }) {
  const hostCtx = usePluginHostCtx();
  const loadedRef = useRef(false);
  const [pluginsLoaded, setPluginsLoaded] = useState(false);
  
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    
    const urls = CONFIG.PLUGINS || [];
    const allow = CONFIG.PLUGIN_CAPABILITIES_ALLOWLIST || [];
    
    // Load local plugins first (synchronous)
    try {
      loadLocalPlugins(hostCtx, allow);
    } catch (error) {
      console.error('Local plugins failed to load:', error);
    }
    
    // Then load external plugins (asynchronous)
    if (urls.length > 0) {
      loadExternalPlugins(urls, hostCtx, allow)
        .catch((error) => {
          console.error('External plugins failed to load:', error);
        })
        .finally(() => {
          // Mark as loaded after both local and external plugins have attempted to load
          setPluginsLoaded(true);
        });
    } else {
      // No external plugins, mark as loaded after local plugins attempt
      // App continues even if local plugins fail (error is logged above)
      setPluginsLoaded(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps: only load plugins once on mount, hostCtx is stable
  
  // Wait for plugins to load before rendering children with routes
  if (!pluginsLoaded) {
    return <div className="loading-fallback" />;
  }
  
  return <>{children}</>;
}

function DynamicRouter() {
  // getRoutes() reads from the current routeRegistry state
  // React Router's useRoutes handles route updates efficiently
  return useRoutes(getRoutes() as any);
}

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
            alert: AlertModal,
            "transaction-confirm": TransactionConfirmModal,
            "connect-wallet": ConnectWalletModal,
            "tip": TipModal,
          }}
        />
      </Suspense>
      <PluginHostProvider>
        <PluginBootstrap>
          <Suspense fallback={<div className="loading-fallback" />}>
            <div className="app-routes-container"><DynamicRouter /></div>
          </Suspense>
        </PluginBootstrap>
      </PluginHostProvider>
    </div>
  );
}
