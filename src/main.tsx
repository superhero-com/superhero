import * as Sentry from '@sentry/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'jotai';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import { OpenAPI } from './api/generated';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import ToastProvider from './components/ToastProvider';
import { CONFIG } from './config';
import { AePricePollingProvider } from './context/AePricePollingProvider';
import { AeSdkProvider } from './context/AeSdkProvider';
import { TransactionNotificationBanner, TransactionNotificationProvider } from './features/transaction-notification';
import './i18n';
import './instrument';
import './styles/base.scss';
import './styles/tailwind.css';

OpenAPI.BASE = (CONFIG.SUPERHERO_API_URL || 'https://api.superhero.com').replace(/\/$/, '');

const root = ReactDOM.createRoot(document.getElementById('root')!);

// Create a client for TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

(async () => {
  root.render(
    <React.StrictMode>
      <Sentry.ErrorBoundary fallback={<p>An unexpected error occurred.</p>} showDialog>
        <HelmetProvider>
          <Helmet>
            <title>Superhero.com – The All‑in‑One Social + Crypto App</title>
          </Helmet>
          <QueryClientProvider client={queryClient}>
            <Provider>
              <AePricePollingProvider>
                <ToastProvider>
                  <BrowserRouter>
                    <TransactionNotificationProvider>
                      <TransactionNotificationBanner />
                      <ErrorBoundary>
                        <AeSdkProvider>
                          <App />
                        </AeSdkProvider>
                      </ErrorBoundary>
                    </TransactionNotificationProvider>
                  </BrowserRouter>
                </ToastProvider>
              </AePricePollingProvider>
            </Provider>
          </QueryClientProvider>
        </HelmetProvider>
      </Sentry.ErrorBoundary>
    </React.StrictMode>,
  );
})();
