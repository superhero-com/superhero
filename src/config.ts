import { Encoded } from '@aeternity/aepp-sdk';

export type AppConfig = {
  BACKEND_URL: string;
  SUPERHERO_API_URL?: string;
  NODE_URL: string;
  WALLET_URL: string;
  MIDDLEWARE_URL: string;
  DEX_BACKEND_URL?: string;
  MAINNET_DEX_BACKEND_URL?: string;
  TESTNET_DEX_BACKEND_URL?: string;
  CONTRACT_V3_ADDRESS: string;
  POPULAR_FEED_ENABLED: boolean;
  JITSI_DOMAIN: string;
  GOVERNANCE_API_URL: string;
  GOVERNANCE_CONTRACT_ADDRESS: Encoded.ContractAddress;
  EXPLORER_URL?: string;
  GIPHY_API_KEY?: string;
  /** X (Twitter) OAuth 2.0 client id for "Connect X" (PKCE flow). If unset, Connect X is hidden. */
  X_OAUTH_CLIENT_ID?: string;
  /** Profile registry contract used for profile writes/reads. */
  PROFILE_REGISTRY_CONTRACT_ADDRESS?: Encoded.ContractAddress;
};

const defaultConfig: AppConfig = {
  BACKEND_URL: 'http://localhost:3000',
  SUPERHERO_API_URL: 'http://localhost:3000',
  NODE_URL: 'https://mdw.wordcraft.fun',
  WALLET_URL: 'https://wallet.superhero.com',
  MIDDLEWARE_URL: 'https://mdw.wordcraft.fun/mdw',
  JITSI_DOMAIN: 'meet.jit.si',
  EXPLORER_URL: 'https://aescan.io',
  GIPHY_API_KEY: process.env.VITE_GIPHY_API_KEY ?? 'P16yBDlSeEfcrJfp1rwnamtEZmQHxHNM',
  DEX_BACKEND_URL: 'https://dex-backend-mainnet.prd.service.aepps.com',
  MAINNET_DEX_BACKEND_URL: 'https://dex-backend-mainnet.prd.service.aepps.com',
  TESTNET_DEX_BACKEND_URL: 'https://dex-backend-testnet.prd.service.aepps.com',
  CONTRACT_V3_ADDRESS: 'ct_2Hyt9ZxzXra5NAzhePkRsDPDWppoatVD7CtHnUoHVbuehwR8Nb',
  POPULAR_FEED_ENABLED: true,
  GOVERNANCE_API_URL:
    'https://governance-server-mainnet.prd.service.aepps.com/',
  GOVERNANCE_CONTRACT_ADDRESS:
    'ct_ouZib4wT9cNwgRA1pxgA63XEUd8eQRrG8PcePDEYogBc1VYTq',
  X_OAUTH_CLIENT_ID: (process.env as any).VITE_X_OAUTH_CLIENT_ID ?? '',
  PROFILE_REGISTRY_CONTRACT_ADDRESS: (
    (import.meta as any)?.env?.VITE_PROFILE_REGISTRY_CONTRACT_ADDRESS
    || (typeof process !== 'undefined' && (process as any).env?.VITE_PROFILE_REGISTRY_CONTRACT_ADDRESS)
    || ''
  ) as Encoded.ContractAddress,
};

// Allow local development overrides via Vite env vars set at build time
// e.g. VITE_SUPERHERO_API_URL
// Try import.meta.env first, then fallback to process.env (for Vite compatibility)
const envApiUrl = ((import.meta as any)?.env?.VITE_SUPERHERO_API_URL
  || (typeof process !== 'undefined' && (process as any).env?.VITE_SUPERHERO_API_URL)) as string | undefined;

declare global {
  interface Window {
    __SUPERCONFIG__?: Partial<AppConfig>;
  }
}

function toBool(v: any): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return v.toLowerCase() === 'true' || v === '1';
  return false;
}

function isPlaceholder(v: unknown): boolean {
  return typeof v === 'string' && (/^\$[A-Z0-9_]+$/.test(v) || v.trim() === '');
}

function coerceValue(key: keyof AppConfig, v: any): any {
  if (key === 'POPULAR_FEED_ENABLED') return toBool(v);
  return v;
}

const SUPERCONFIG_KEY = '__SUPERCONFIG__' as const;
const runtimeRaw = (
  typeof window !== 'undefined'
    ? window[SUPERCONFIG_KEY]
    : undefined
) as Partial<AppConfig> | undefined;
const runtimeConfig: Partial<AppConfig> = runtimeRaw
  ? Object.fromEntries(
    Object.entries(runtimeRaw)
      .filter(([, v]) => v !== undefined && v !== null && !isPlaceholder(v))
      .map(([k, v]) => [k, coerceValue(k as keyof AppConfig, v)]),
  ) as Partial<AppConfig>
  : {};

export const CONFIG: AppConfig = {
  ...defaultConfig,
  ...runtimeConfig,
  // Vite env overrides for local builds - MUST come after runtimeConfig to override it
  ...(envApiUrl ? { SUPERHERO_API_URL: envApiUrl } : {}),
  // Ensure POPULAR_FEED_ENABLED defaults to true if not explicitly set
  POPULAR_FEED_ENABLED: runtimeConfig.POPULAR_FEED_ENABLED
    ?? defaultConfig.POPULAR_FEED_ENABLED
    ?? true,
};
