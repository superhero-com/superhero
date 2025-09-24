"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Provider as JotaiProvider } from "jotai";
import ToastProvider from "@super/components/ToastProvider";
import { AeSdkProvider } from "@super/context/AeSdkProvider";
import { OpenAPI } from "@super/api/generated";
import { loadConfig, CONFIG } from "@super/config";
import "@super/i18n";
import ModalProvider from "@super/components/ModalProvider";
import dynamic from "next/dynamic";
const BrowserRouter = dynamic(() => import("react-router-dom").then(m => m.BrowserRouter), { ssr: false });
const PostModal = dynamic(() => import("@super/components/modals/PostModal"));
const CookiesDialog = dynamic(() => import("@super/components/modals/CookiesDialog"));
const TokenSelectModal = dynamic(() => import("@super/components/modals/TokenSelect"));
const ImageGallery = dynamic(() => import("@super/components/modals/ImageGallery"));
const FeedItemMenu = dynamic(() => import("@super/components/modals/FeedItemMenu"));
const AlertModal = dynamic(() => import("@super/components/modals/AlertModal"));
const TransactionConfirmModal = dynamic(() => import("@super/components/modals/TransactionConfirmModal"));
const ConnectWalletModal = dynamic(() => import("@super/components/modals/ConnectWalletModal"));

export default function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await loadConfig();
      } catch {}
      // Set OpenAPI after config load
      OpenAPI.BASE = process.env.NEXT_PUBLIC_API_BASE || CONFIG.BACKEND_URL || "https://api.dev.tokensale.org";
      if (mounted) setReady(true);
    })();
    return () => { mounted = false; };
  }, []);

  if (!ready) return null;

  return (
    <QueryClientProvider client={client}>
      <JotaiProvider>
        <ToastProvider>
          <BrowserRouter>
          <AeSdkProvider>
            <ModalProvider
              registry={{
                post: PostModal as any,
                "cookies-dialog": CookiesDialog as any,
                "token-select": TokenSelectModal as any,
                "image-gallery": ImageGallery as any,
                "feed-item-menu": FeedItemMenu as any,
                alert: AlertModal as any,
                "transaction-confirm": TransactionConfirmModal as any,
                "connect-wallet": ConnectWalletModal as any,
              }}
            />
            {children}
          </AeSdkProvider>
          </BrowserRouter>
        </ToastProvider>
      </JotaiProvider>
    </QueryClientProvider>
  );
}


