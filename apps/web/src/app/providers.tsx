"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Provider as JotaiProvider } from "jotai";
import ToastProvider from "@super/components/ToastProvider";
import { AeSdkProvider } from "@super/context/AeSdkProvider";
import { OpenAPI } from "@super/api/generated";
import "@super/i18n";
import ModalProvider from "@super/components/ModalProvider";
import dynamic from "next/dynamic";
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
  OpenAPI.BASE = process.env.NEXT_PUBLIC_API_BASE || "https://api.dev.tokensale.org";
  return (
    <QueryClientProvider client={client}>
      <JotaiProvider>
        <ToastProvider>
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
        </ToastProvider>
      </JotaiProvider>
    </QueryClientProvider>
  );
}


