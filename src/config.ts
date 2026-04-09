import { Encoded } from '@aeternity/aepp-sdk';

/**
 * Network identifier: mainnet (`ae_mainnet`) or testnet (`ae_uat`).
 * Set via VITE_NETWORK in .env at build time.
 */
export type Network = 'ae_mainnet' | 'ae_uat';

/** Settings shared across mainnet and testnet builds (not tied to chain RPC / contracts). */
type CommonConfig = {
  WALLET_URL: string;
  JITSI_DOMAIN: string;
  MAINNET_DEX_BACKEND_URL?: string;
  TESTNET_DEX_BACKEND_URL?: string;
  POPULAR_FEED_ENABLED: boolean;
  /** X (Twitter) OAuth 2.0 client id for "Connect X" (PKCE flow). If unset, Connect X is hidden. */
  X_OAUTH_CLIENT_ID?: string;
  /** Profile registry contract used for profile writes/reads. */
  PROFILE_REGISTRY_CONTRACT_ADDRESS?: Encoded.ContractAddress;
};

/**
 * Per-network RPC URLs, DEX deployment, and governance
 * (mainnet vs testnet branch at build time).
 */
type NetworkConfig = {
  /** Current network id: ae_mainnet or ae_uat (testnet). Driven by VITE_NETWORK. */
  NETWORK: Network;
  BACKEND_URL: string;
  SUPERHERO_API_URL?: string;
  NODE_URL: string;
  MIDDLEWARE_URL: string;
  DEX_BACKEND_URL?: string;
  EXPLORER_URL?: string;
  /** DEX contract addresses (depend on network). */
  DEX_FACTORY: Encoded.ContractAddress;
  DEX_ROUTER: Encoded.ContractAddress;
  DEX_WAE: Encoded.ContractAddress;
  DEX_AEETH: Encoded.ContractAddress;
  CONTRACT_V3_ADDRESS: string;
  GOVERNANCE_API_URL: string;
  GOVERNANCE_CONTRACT_ADDRESS: Encoded.ContractAddress;
};

type AppConfig = CommonConfig & NetworkConfig;
export type NetworkDefinition = NetworkConfig & {
  name: string;
  websocketUrl: string;
  compilerUrl: string;
  superheroBackendUrl: string;
  disabled?: boolean;
};
export const APP_NAME = 'Superhero';
export const TRENDING_ENABLED = true;

function getNetworkFromEnv(): Network {
  const raw = (import.meta as any)?.env?.VITE_NETWORK
    ?? (typeof process !== 'undefined' && (process as any).env?.VITE_NETWORK)
    ?? 'ae_mainnet';
  const v = String(raw).toLowerCase().trim();
  if (v === 'ae_uat') return 'ae_uat';
  return 'ae_mainnet';
}

const envNetwork = getNetworkFromEnv();
const isMainnet = envNetwork === 'ae_mainnet';

/** Shared by mainnet and testnet; combined with {@link mainnetConfig} or {@link testnetConfig}. */
export const COMMON_CONFIG = {
  WALLET_URL: 'https://wallet.superhero.com',
  JITSI_DOMAIN: 'meet.jit.si',
  MAINNET_DEX_BACKEND_URL: 'https://dex-backend-mainnet.prd.service.aepps.com',
  TESTNET_DEX_BACKEND_URL: 'https://dex-backend-testnet.prd.service.aepps.com',
  POPULAR_FEED_ENABLED: true,
  X_OAUTH_CLIENT_ID: (process.env as any).VITE_X_OAUTH_CLIENT_ID ?? '',
  PROFILE_REGISTRY_CONTRACT_ADDRESS: (
    (import.meta as any)?.env?.VITE_PROFILE_REGISTRY_CONTRACT_ADDRESS
    || (typeof process !== 'undefined' && (process as any).env?.VITE_PROFILE_REGISTRY_CONTRACT_ADDRESS)
    || ''
  ) as Encoded.ContractAddress,
} satisfies CommonConfig;

export const NETWORKS: Record<Network, NetworkDefinition> = {
  ae_mainnet: {
    name: 'Mainnet',
    NETWORK: 'ae_mainnet',
    BACKEND_URL: 'https://api.superhero.com',
    SUPERHERO_API_URL: 'https://api.superhero.com',
    NODE_URL: 'https://mdw.wordcraft.fun',
    MIDDLEWARE_URL: 'https://mdw.wordcraft.fun/mdw',
    EXPLORER_URL: 'https://aescan.io',
    websocketUrl: 'https://api.superhero.com',
    compilerUrl: 'https://v7.compiler.aepps.com',
    superheroBackendUrl: 'https://superhero-backend-mainnet.prd.service.aepps.com',
    DEX_BACKEND_URL: 'https://dex-backend-mainnet.prd.service.aepps.com',
    DEX_FACTORY: 'ct_2mfj3FoZxnhkSw5RZMcP8BfPoB1QR4QiYGNCdkAvLZ1zfF6paW' as Encoded.ContractAddress,
    DEX_ROUTER: 'ct_azbNZ1XrPjXfqBqbAh1ffLNTQ1sbnuUDFvJrXjYz7JQA1saQ3' as Encoded.ContractAddress,
    DEX_WAE: 'ct_J3zBY8xxjsRr3QojETNw48Eb38fjvEuJKkQ6KzECvubvEcvCa' as Encoded.ContractAddress,
    DEX_AEETH: 'ct_ryTY1mxqjCjq1yBn9i6HDaCSdA6thXUFZTA84EMzbWd1SLKdh' as Encoded.ContractAddress,
    CONTRACT_V3_ADDRESS: 'ct_2Hyt9ZxzXra5NAzhePkRsDPDWppoatVD7CtHnUoHVbuehwR8Nb' as Encoded.ContractAddress,
    GOVERNANCE_API_URL: 'https://governance-server-mainnet.prd.service.aepps.com/',
    GOVERNANCE_CONTRACT_ADDRESS: 'ct_ouZib4wT9cNwgRA1pxgA63XEUd8eQRrG8PcePDEYogBc1VYTq' as Encoded.ContractAddress,
    disabled: true,
  },
  ae_uat: {
    name: 'Testnet',
    NETWORK: 'ae_uat',
    BACKEND_URL: 'https://testnet.api.dev.tokensale.org',
    SUPERHERO_API_URL: 'https://testnet.api.dev.tokensale.org',
    NODE_URL: 'https://testnet.aeternity.io',
    MIDDLEWARE_URL: 'https://testnet.aeternity.io/mdw',
    EXPLORER_URL: 'https://testnet.aescan.io',
    websocketUrl: 'https://testnet.api.dev.tokensale.org',
    compilerUrl: 'https://v7.compiler.aepps.com',
    superheroBackendUrl: 'https://superhero-backend-testnet.prd.service.aepps.com',
    DEX_BACKEND_URL: 'https://dex-backend-testnet.prd.service.aepps.com',
    DEX_FACTORY: 'ct_NhbxN8wg8NLkGuzwRNDQhMDKSKBwDAQgxQawK7tkigi2aC7i9' as Encoded.ContractAddress,
    DEX_ROUTER: 'ct_MLXQEP12MBn99HL6WDaiTqDbG4bJQ3Q9Bzr57oLfvEkghvpFb' as Encoded.ContractAddress,
    DEX_WAE: 'ct_JDp175ruWd7mQggeHewSLS1PFXt9AzThCDaFedxon8mF8xTRF' as Encoded.ContractAddress,
    DEX_AEETH: 'ct_WVqAvLQpvZCgBg4faZLXA1YBj43Fxj91D33Z8K7pFsY8YCofv' as Encoded.ContractAddress,
    CONTRACT_V3_ADDRESS: 'ct_2J1wuuw9urs9ADBh5QbvuPyUCLdKbW5YRkfhgPoN7rGjBbPiBW' as Encoded.ContractAddress,
    GOVERNANCE_API_URL: 'https://governance-server-testnet.prd.service.aepps.com/',
    GOVERNANCE_CONTRACT_ADDRESS: 'ct_2nritSnqW6zooEL4g2SMW5pf12GUbrNyZ17osTLrap7wXiSSjf' as Encoded.ContractAddress,
  },
};
export const CURRENT_NETWORK_CONFIG = NETWORKS[envNetwork];

function toRuntimeNetworkConfig({
  NETWORK,
  BACKEND_URL,
  SUPERHERO_API_URL,
  NODE_URL,
  MIDDLEWARE_URL,
  DEX_BACKEND_URL,
  EXPLORER_URL,
  DEX_FACTORY,
  DEX_ROUTER,
  DEX_WAE,
  DEX_AEETH,
  CONTRACT_V3_ADDRESS,
  GOVERNANCE_API_URL,
  GOVERNANCE_CONTRACT_ADDRESS,
}: NetworkDefinition): NetworkConfig {
  return {
    NETWORK,
    BACKEND_URL,
    SUPERHERO_API_URL,
    NODE_URL,
    MIDDLEWARE_URL,
    DEX_BACKEND_URL,
    EXPLORER_URL,
    DEX_FACTORY,
    DEX_ROUTER,
    DEX_WAE,
    DEX_AEETH,
    CONTRACT_V3_ADDRESS,
    GOVERNANCE_API_URL,
    GOVERNANCE_CONTRACT_ADDRESS,
  };
}

const mainnetConfig: NetworkConfig = toRuntimeNetworkConfig(NETWORKS.ae_mainnet);
const testnetConfig: NetworkConfig = toRuntimeNetworkConfig(NETWORKS.ae_uat);

const defaultConfig: AppConfig = {
  ...COMMON_CONFIG,
  ...(isMainnet ? mainnetConfig : testnetConfig),
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
