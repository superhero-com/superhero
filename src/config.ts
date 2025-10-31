import { Encoded } from "@aeternity/aepp-sdk";

export type AppConfig = {
  BACKEND_URL: string;
  SUPERHERO_API_URL?: string;
  SUPERHERO_WS_URL?: string;
  NODE_URL: string;
  WALLET_URL: string;
  MIDDLEWARE_URL: string;
  DEX_BACKEND_URL?: string;
  MAINNET_DEX_BACKEND_URL?: string;
  TESTNET_DEX_BACKEND_URL?: string;
  CONTRACT_V1_ADDRESS: string;
  CONTRACT_V2_ADDRESS: string;
  CONTRACT_V3_ADDRESS: string;
  WORD_REGISTRY_ADDRESS: string;
  PROFILE_REGISTRY_ADDRESS?: Encoded.ContractAddress;
  LANDING_ENABLED: boolean;
  WORDBAZAAR_ENABLED: boolean;
  JITSI_DOMAIN: string;
  GOVERNANCE_API_URL: string;
  GOVERNANCE_CONTRACT_ADDRESS: Encoded.ContractAddress;
  EXPLORER_URL?: string;
  IMGUR_API_CLIENT_ID?: string;
  GIPHY_API_KEY?: string;
  UNFINISHED_FEATURES?: string;
  COMMIT_HASH?: string;
  BONDING_CURVE_18_DECIMALS_ADDRESS?: string;
};

const defaultConfig: AppConfig = {
  BACKEND_URL: "https://raendom-backend.z52da5wt.xyz",
  SUPERHERO_API_URL: "https://api.superhero.com",
  SUPERHERO_WS_URL: "https://api.superhero.com",
  NODE_URL: "https://mdw.wordcraft.fun",
  WALLET_URL: "https://wallet.superhero.com",
  MIDDLEWARE_URL: "https://mdw.wordcraft.fun/mdw",
  JITSI_DOMAIN: "meet.jit.si",
  EXPLORER_URL: "https://aescan.io",
  IMGUR_API_CLIENT_ID: "",
  GIPHY_API_KEY: process.env.VITE_GIPHY_API_KEY ?? 'P16yBDlSeEfcrJfp1rwnamtEZmQHxHNM',
  COMMIT_HASH: "",
  DEX_BACKEND_URL: "https://dex-backend-mainnet.prd.service.aepps.com",
  MAINNET_DEX_BACKEND_URL: "https://dex-backend-mainnet.prd.service.aepps.com",
  TESTNET_DEX_BACKEND_URL: "https://dex-backend-testnet.prd.service.aepps.com",
  CONTRACT_V3_ADDRESS: "ct_2Hyt9ZxzXra5NAzhePkRsDPDWppoatVD7CtHnUoHVbuehwR8Nb",
  CONTRACT_V33333_ADDRESS:
    "ct_WscpdLQf6ZZxoVqrsEwUwmuAEdzEkJii5W5TzG84rVgHeK6BW",

  CONTRACT_V1_ADDRESS: "",
  CONTRACT_V2_ADDRESS: "",
  WORD_REGISTRY_ADDRESS: "",
  PROFILE_REGISTRY_ADDRESS: "",
  LANDING_ENABLED: false,
  WORDBAZAAR_ENABLED: false,
  GOVERNANCE_API_URL:
    "https://governance-server-mainnet.prd.service.aepps.com/",
  GOVERNANCE_CONTRACT_ADDRESS:
    "ct_ouZib4wT9cNwgRA1pxgA63XEUd8eQRrG8PcePDEYogBc1VYTq",

  UNFINISHED_FEATURES: "",

  BONDING_CURVE_18_DECIMALS_ADDRESS: "",
};

// Allow local development overrides via Vite env vars set at build time
// e.g. VITE_SUPERHERO_API_URL, VITE_SUPERHERO_WS_URL
// Try import.meta.env first, then fallback to process.env (for Vite compatibility)
const envApiUrl = ((import.meta as any)?.env?.VITE_SUPERHERO_API_URL || 
  (typeof process !== 'undefined' && (process as any).env?.VITE_SUPERHERO_API_URL)) as string | undefined;
const envWsUrl = ((import.meta as any)?.env?.VITE_SUPERHERO_WS_URL || 
  (typeof process !== 'undefined' && (process as any).env?.VITE_SUPERHERO_WS_URL)) as string | undefined;

// Debug logging in development
if (typeof window !== 'undefined' && (import.meta as any)?.env?.MODE === 'development') {
  console.log('[Config] VITE_SUPERHERO_API_URL from import.meta.env:', envApiUrl);
  console.log('[Config] All VITE_ env vars:', Object.keys((import.meta as any)?.env || {}).filter(k => k.startsWith('VITE_')));
}

declare global {
  interface Window {
    __SUPERCONFIG__?: Partial<AppConfig>;
  }
}

function toBool(v: any): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") return v.toLowerCase() === "true" || v === "1";
  return false;
}

function isPlaceholder(v: unknown): boolean {
  return typeof v === 'string' && (/^\$[A-Z0-9_]+$/.test(v) || v.trim() === '');
}

function coerceValue(key: keyof AppConfig, v: any): any {
  if (key === 'LANDING_ENABLED' || key === 'WORDBAZAAR_ENABLED') return toBool(v);
  return v;
}

const runtimeRaw = (typeof window !== 'undefined' ? window.__SUPERCONFIG__ : undefined) as Partial<AppConfig> | undefined;
const runtimeConfig: Partial<AppConfig> = runtimeRaw
  ? Object.fromEntries(
      Object.entries(runtimeRaw)
        .filter(([, v]) => v !== undefined && v !== null && !isPlaceholder(v))
        .map(([k, v]) => [k, coerceValue(k as keyof AppConfig, v)])
    ) as Partial<AppConfig>
  : {};

export const CONFIG: AppConfig = {
  ...defaultConfig,
  ...runtimeConfig,
  // Vite env overrides for local builds - MUST come after runtimeConfig to override it
  ...(envApiUrl ? { SUPERHERO_API_URL: envApiUrl } : {}),
  ...(envWsUrl ? { SUPERHERO_WS_URL: envWsUrl } : {}),
};

// Debug logging in development - always log to help debug
if (typeof window !== 'undefined') {
  const mode = (import.meta as any)?.env?.MODE;
  console.log('[Config Debug] MODE:', mode);
  console.log('[Config Debug] envApiUrl:', envApiUrl);
  console.log('[Config Debug] runtimeConfig.SUPERHERO_API_URL:', runtimeConfig.SUPERHERO_API_URL);
  console.log('[Config Debug] Final CONFIG.SUPERHERO_API_URL:', CONFIG.SUPERHERO_API_URL);
  console.log('[Config Debug] import.meta.env keys:', Object.keys((import.meta as any)?.env || {}));
}
