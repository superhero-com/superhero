"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Provider as JotaiProvider } from "jotai";
import ToastProvider from "@super/components/ToastProvider";
import { AeSdkProvider } from "@super/context/AeSdkProvider";
import { OpenAPI } from "@super/api/generated";
import "@super/i18n";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());
  OpenAPI.BASE = process.env.NEXT_PUBLIC_API_BASE || "https://api.dev.tokensale.org";
  return (
    <QueryClientProvider client={client}>
      <JotaiProvider>
        <ToastProvider>
          <AeSdkProvider>{children}</AeSdkProvider>
        </ToastProvider>
      </JotaiProvider>
    </QueryClientProvider>
  );
}


