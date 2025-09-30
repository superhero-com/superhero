import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'jotai';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { OpenAPI } from './api/generated';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import ToastProvider from './components/ToastProvider';
import { AeSdkProvider } from './context/AeSdkProvider';
import './i18n';
import './styles/base.scss';
import './styles/tailwind.css';

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

(async () => {


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


