/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Network at build time: ae_mainnet (default) or ae_uat (testnet) */
  readonly VITE_NETWORK?: string;
  readonly VITE_GOVERNANCE_API_URL?: string;
  readonly VITE_GOVERNANCE_CONTRACT_ADDRESS?: string;
  readonly VITE_NODE_URL?: string;
  readonly VITE_WALLET_URL?: string;
  readonly VITE_BACKEND_URL?: string;
  readonly VITE_MIDDLEWARE_URL?: string;
  readonly VITE_X_OAUTH_CLIENT_ID?: string;
  /** Build-time-pinned WebAuthn RP ID (custody boundary). Defaults to superhero.com. */
  readonly VITE_WEBAUTHN_RP_ID?: string;
  /** Enables the inline wallet. Off unless the exact string 'true'. */
  readonly VITE_INLINE_WALLET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// SVG module declarations for Vite
declare module '*.svg?react' {
  import React from 'react';

  const Component: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  export default Component;
}
