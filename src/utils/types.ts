import { BrowserWindowMessageConnection } from "@aeternity/aepp-sdk";

export interface INetwork {
  url: string;
  name: string;
  apiUrl: string;
  middlewareUrl: string;
  explorerUrl: string;
  networkId: NetworkId;
  compilerUrl: string;
  websocketUrl: string;
  superheroBackendUrl: string;
  index?: number;
  disabled?: boolean;
}

export type NetworkId = "ae_mainnet" | "ae_uat";

export interface IAppConfigs {
  app: {
    name: string;
    logo: {
      width: string;
      height: string;
    };
    allowSwitchTheme?: boolean;
  };
  wallet: {
    name: string;
    url: string;
  };
  networks: Record<NetworkId, INetwork>;
  // languages: SupportedLanguage[];
  avatarServiceUrl: string;

  features: {
    trendminer: boolean;
  };
}

export interface Wallet {
  info: {
    id: string;
    type: string;
    origin: string;
  };
  getConnection: () => BrowserWindowMessageConnection;
}

export interface Wallets {
  [key: string]: Wallet;
}

export type CurrencyCode =
  | "usd"
  | "eur"
  | "aud"
  | "brl"
  | "cad"
  | "chf"
  | "gbp"
  | "xau";

export interface ICurrency {
  name: string;
  code: CurrencyCode;
  symbol: string;
}
export type CurrencyRates = Partial<Record<CurrencyCode, number>>;

export interface FormattedFractionalPrice {
  /** A string representation of the number with leading zeros */
  number: string;
  /** The count of leading zeros in the fractional part */
  zerosCount?: number;
  /** The first four significant digits in the fractional part */
  significantDigits?: string;
  /** A formatted string representing the fractional part with leading zeros */
  value?: string;
}
