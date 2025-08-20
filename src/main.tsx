import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import ToastProvider from './components/ToastProvider';
import { CONFIG, loadConfig, assertConfig } from './config';
import { store } from './store/store';
import './styles/tailwind.css';
import './styles/base.scss';
import './i18n';

const root = ReactDOM.createRoot(document.getElementById('root')!);

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
      <Provider store={store}>
        <ToastProvider>
          <BrowserRouter>
            <ErrorBoundary>
              <App />
            </ErrorBoundary>
          </BrowserRouter>
        </ToastProvider>
      </Provider>
    </React.StrictMode>,
  );
})();


