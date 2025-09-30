import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'jotai';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import ToastProvider from './components/ToastProvider';
import { CONFIG, loadConfig, assertConfig } from './config';
import './styles/tailwind.css';
import './styles/base.scss';
import './i18n';
import { OpenAPI } from './api/generated';
import { AeSdkProvider } from './context/AeSdkProvider';

// TODO: should be based on the active network
// OpenAPI.BASE = `http://localhost:3000`;
OpenAPI.BASE = `https://api.superhero.com`;

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

const IME: any = import.meta as any;
// Bootstrap: load runtime config before rendering
(async () => {
  await loadConfig();
  // eslint-disable-next-line no-console
  console.group('%cConfig diagnostics', 'color:#0af');
  console.info('import.meta.env.MODE:', IME?.env?.MODE, 'BASE_URL:', IME?.env?.BASE_URL);
  console.info('Resolved CONFIG object:', CONFIG);
  console.groupEnd();
  (window as any).CONFIG = CONFIG;
  (window as any).VITE = IME.env;
  assertConfig();

  // Initialize theme early to avoid flash of incorrect theme
  try {
    const storedTheme = localStorage.getItem('theme');
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    const theme = storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : (prefersLight ? 'light' : 'dark');
    document.documentElement.dataset.theme = theme;
  } catch {}

  root.render(
    <React.StrictMode>
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
    </React.StrictMode>,
  );
})();


