import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'jotai';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { OpenAPI } from './api/generated';
import { CONFIG } from './config';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import ToastProvider from './components/ToastProvider';
import { AeSdkProvider } from './context/AeSdkProvider';
import './i18n';
import './styles/base.scss';
import './styles/tailwind.css';
import { HelmetProvider, Helmet } from 'react-helmet-async';

OpenAPI.BASE = (CONFIG.SUPERHERO_API_URL || 'https://api.superhero.com').replace(/\/$/, '');
console.log('[main.tsx] OpenAPI.BASE set to:', OpenAPI.BASE);
console.log('[main.tsx] CONFIG.SUPERHERO_API_URL:', CONFIG.SUPERHERO_API_URL);

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
      <HelmetProvider>
        <Helmet>
          <title>Superhero.com – The All‑in‑One Social + Crypto App</title>
        </Helmet>
        <QueryClientProvider client={queryClient}>
          <Provider>
            <ToastProvider>
              <BrowserRouter>
                <ErrorBoundary>
                  <AeSdkProvider>
                    <App />
                  </AeSdkProvider>
                </ErrorBoundary>
              </BrowserRouter>
            </ToastProvider>
          </Provider>
        </QueryClientProvider>
      </HelmetProvider>
    </React.StrictMode>,
  );
})();


