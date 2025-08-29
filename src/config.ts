import { Encoded } from "@aeternity/aepp-sdk";

export type AppConfig = {
  BACKEND_URL: string;
  TRENDMINER_API_URL?: string;
  TRENDMINER_WS_URL?: string;
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
  LANDING_ENABLED: boolean;
  WORDBAZAAR_ENABLED: boolean;
  JITSI_DOMAIN: string;
  GOVERNANCE_URL: string;
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
  BACKEND_URL: '',
  TRENDMINER_API_URL: '',
  TRENDMINER_WS_URL: '',
  NODE_URL: '',
  WALLET_URL: '',
  MIDDLEWARE_URL: '',
  CONTRACT_V1_ADDRESS: '',
  CONTRACT_V2_ADDRESS: '',
  CONTRACT_V3_ADDRESS: '',
  WORD_REGISTRY_ADDRESS: '',
  LANDING_ENABLED: false,
  WORDBAZAAR_ENABLED: false,
  JITSI_DOMAIN: '',
  GOVERNANCE_URL: '',
  GOVERNANCE_API_URL: '',
  GOVERNANCE_CONTRACT_ADDRESS: 'ct_ouZib4wT9cNwgRA1pxgA63XEUd8eQRrG8PcePDEYogBc1VYTq',
  DEX_BACKEND_URL: '',
  MAINNET_DEX_BACKEND_URL: '',
  TESTNET_DEX_BACKEND_URL: '',
  EXPLORER_URL: '',
  IMGUR_API_CLIENT_ID: '',
  GIPHY_API_KEY: '',
  UNFINISHED_FEATURES: '',
  COMMIT_HASH: '',
  BONDING_CURVE_18_DECIMALS_ADDRESS: '',
};

export let CONFIG: AppConfig = { ...defaultConfig };

function toBool(v: any): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string') return v.toLowerCase() === 'true' || v === '1';
  return false;
}

function normalizeKeys(raw: Record<string, any>): Partial<AppConfig> {
  // Accept both legacy VUE_APP_* keys and new plain keys
  const get = (...keys: string[]) => keys.map((k) => raw[k]).find((v) => v !== undefined);
  return {
    BACKEND_URL: get('BACKEND_URL', 'VUE_APP_BACKEND_URL', 'VITE_BACKEND_URL') || '',
    TRENDMINER_API_URL: get('TRENDMINER_API_URL', 'VUE_APP_TRENDMINER_API_URL', 'VITE_TRENDMINER_API_URL') || '',
    TRENDMINER_WS_URL: get('TRENDMINER_WS_URL', 'VUE_APP_TRENDMINER_WS_URL', 'VITE_TRENDMINER_WS_URL') || '',
    NODE_URL: get('NODE_URL', 'VUE_APP_NODE_URL', 'VITE_NODE_URL') || '',
    WALLET_URL: get('WALLET_URL', 'VUE_APP_WALLET_URL', 'VITE_WALLET_URL') || '',
    MIDDLEWARE_URL: get('MIDDLEWARE_URL', 'VUE_APP_MIDDLEWARE_URL', 'VITE_MIDDLEWARE_URL') || '',
    DEX_BACKEND_URL: get('DEX_BACKEND_URL', 'VITE_DEX_BACKEND_URL') || '',
    MAINNET_DEX_BACKEND_URL: get('MAINNET_DEX_BACKEND_URL', 'VITE_MAINNET_DEX_BACKEND_URL') || '',
    TESTNET_DEX_BACKEND_URL: get('TESTNET_DEX_BACKEND_URL', 'VITE_TESTNET_DEX_BACKEND_URL') || '',
    CONTRACT_V1_ADDRESS: get('CONTRACT_V1_ADDRESS', 'VUE_APP_CONTRACT_V1_ADDRESS', 'VITE_CONTRACT_V1_ADDRESS') || '',
    CONTRACT_V2_ADDRESS: get('CONTRACT_V2_ADDRESS', 'VUE_APP_CONTRACT_V2_ADDRESS', 'VITE_CONTRACT_V2_ADDRESS') || '',
    CONTRACT_V3_ADDRESS: get('CONTRACT_V3_ADDRESS', 'VUE_APP_CONTRACT_V3_ADDRESS', 'VITE_CONTRACT_V3_ADDRESS') || '',
    WORD_REGISTRY_ADDRESS: get('WORD_REGISTRY_ADDRESS', 'VUE_APP_WORD_REGISTRY_ADDRESS', 'VITE_WORD_REGISTRY_ADDRESS') || '',
    LANDING_ENABLED: toBool(get('LANDING_ENABLED', 'VUE_APP_LANDING_ENABLED', 'VITE_LANDING_ENABLED')),
    WORDBAZAAR_ENABLED: toBool(get('WORDBAZAAR_ENABLED', 'VUE_APP_WORDBAZAAR_ENABLED', 'VITE_WORDBAZAAR_ENABLED')),
    JITSI_DOMAIN: get('JITSI_DOMAIN', 'VUE_APP_JITSI_HOST', 'VITE_JITSI_DOMAIN') || '',
    GOVERNANCE_URL: get('GOVERNANCE_URL', 'VUE_APP_GOVERNANCE_URL', 'VITE_GOVERNANCE_URL') || '',
    GOVERNANCE_API_URL: get('GOVERNANCE_API_URL', 'VUE_APP_GOVERNANCE_API_URL', 'VITE_GOVERNANCE_API_URL') || '',
    GOVERNANCE_CONTRACT_ADDRESS: raw['VITE_GOVERNANCE_CONTRACT_ADDRESS'],
    EXPLORER_URL: get('EXPLORER_URL', 'VUE_APP_EXPLORER_URL', 'VITE_EXPLORER_URL') || '',
    IMGUR_API_CLIENT_ID: get('IMGUR_API_CLIENT_ID', 'VUE_APP_IMGUR_API_CLIENT_ID', 'VITE_IMGUR_API_CLIENT_ID') || '',
    GIPHY_API_KEY: get('GIPHY_API_KEY', 'VUE_APP_GIPHY_API_KEY', 'VITE_GIPHY_API_KEY') || '',
    UNFINISHED_FEATURES: get('UNFINISHED_FEATURES') || '',
    COMMIT_HASH: get('COMMIT_HASH') || '',
    BONDING_CURVE_18_DECIMALS_ADDRESS: get('BONDING_CURVE_18_DECIMALS_ADDRESS', 'VUE_APP_BONDING_CURVE_18_DECIMALS_ADDRESS') || '',
  } as Partial<AppConfig>;
}

export async function loadConfig(): Promise<void> {
  // Always load from the web root so it works on nested routes
  const origin = (typeof window !== 'undefined' && window.location && window.location.origin)
    ? window.location.origin
    : '';
  const url = `${origin}/superconfig.json`;
  try {
    const res = await fetch(url, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`Failed to load superconfig.json: ${res.status}`);
    const json = await res.json();
    const normalized = normalizeKeys(json);
    CONFIG = { ...defaultConfig, ...normalized } as AppConfig;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[config] Using default config. Reason:', (e as Error).message);
    CONFIG = { ...defaultConfig };
  }
}

export function assertConfig(): void {
  const required: Array<keyof AppConfig> = ['BACKEND_URL', 'NODE_URL', 'WALLET_URL'];
  const missing = required.filter((k) => !CONFIG[k] || (typeof CONFIG[k] === 'string' && (CONFIG[k] as any).length === 0));
  if (missing.length) {
    // eslint-disable-next-line no-console
    console.warn('[config] Missing required keys:', missing.join(', '));
  }
}


