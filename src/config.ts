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
  GIPHY_API_KEY: "",
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

export const CONFIG: AppConfig = { ...defaultConfig };

function toBool(v: any): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") return v.toLowerCase() === "true" || v === "1";
  return false;
}
