/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOVERNANCE_API_URL?: string;
  readonly VITE_GOVERNANCE_URL?: string;
  readonly VITE_NODE_URL?: string;
  readonly VITE_WALLET_URL?: string;
  readonly VITE_BACKEND_URL?: string;
  readonly VITE_MIDDLEWARE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}


