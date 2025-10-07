import { BrowserWindowMessageConnection, Encoded, Tag } from "@aeternity/aepp-sdk";
import {
  PRICE_MOVEMENT_TIMEFRAMES,
  TX_FUNCTIONS,
  WEB_SOCKET_CHANNELS,
} from "@/utils/constants";
import { CancelablePromise } from "@/api/generated/core/CancelablePromise";

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
    trending: boolean;
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

export type CollectionId = `${string}-${Encoded.AccountAddress}`;
export type IAllowedNameChars = {
  [key: string]: number[];
};
export interface ICollectionData {
  id: CollectionId;
  name: string;
  description?: string;
  allowed_name_length: string;
  allowed_name_chars: IAllowedNameChars[];
}

export interface ICommunityFactorySchema {
  address: string;
  collections: Record<string, ICollectionData>;
}

export interface ITopHeader {
  hash: string;
  height: number;
  pofHash: string;
  prevHash: string;
  prevKeyHash: string;
  signature: string;
  stateHash: string;
  time: number;
  txsHash: string;
  version: number;
}
export interface ITransaction {
  blockHeight: number;
  claim: any; // TODO find type
  hash: Encoded.TxHash;
  incomplete?: boolean;
  microIndex: number;
  microTime: number;
  pending: boolean; // There are cases that not only the IPendingTransaction can be pending
  rawTx?: any; // TODO find type
  tipUrl?: string;
  transactionOwner?: Encoded.AccountAddress;
  tx: ITx;
  url?: string;
}

export type WebSocketChannelName = ObjectValues<typeof WEB_SOCKET_CHANNELS>;

export interface IWebSocketSubscriptionMessage {
  payload: WebSocketChannelName;
  target?: string;
}
export interface ITxArguments {
  type: "tuple" | "list" | "int";
  value: any; // TODO find type, this was not correct: (string | number | any[])
}
/**
 * Convert `key: val` objects into union of values.
 */
export type ObjectValues<T> = T[keyof T];
/**
 * TxFunction names coming directly from the API or ready to be sent.
 */
export type TxFunctionRaw = ObjectValues<typeof TX_FUNCTIONS>;
/**
 * TxFunctions used internally by the app.
 */
export type TxFunctionParsed = keyof typeof TX_FUNCTIONS;
export type TxType = 'ContractCreateTx' | 'ContractCallTx';

export type TxFunction = TxFunctionRaw | TxFunctionParsed;
export interface ITx {
  abiVersion: number;
  accountId?: Encoded.AccountAddress;
  amount: number;
  arguments: ITxArguments[];
  callData?: string; // TODO find source
  callerId: Encoded.AccountAddress;
  code: string;
  commitmentId: any;
  contractId: Encoded.ContractAddress;
  fee: number;
  function?: TxFunction;
  gaId?: string; // Generalized Account ID
  gas: number;
  gasPrice: number;
  gasUsed: number;
  log?: any[]; // TODO find source
  name: any;
  nameFee: number;
  nameId: any;
  nameSalt: string;
  nonce: number;
  payerId?: string;
  payload?: string;
  pointers: any;
  result: string;
  return: ITxArguments;
  returnType: string;
  recipientId?: string;
  senderId?: string;
  selectedTokenContractId?: string;
  tag?: Tag; // Allows to establish the transaction type
  type: TxType; // Custom property we add after unpacking the Tx
  tx?: {
    signatures: string[];
    tx: ITx;
  };
  VSN: string;
}

/**
 * TODO remove when src/api/generated/models/Pagination.ts updated
 */
export type CustomPagination<I> = CancelablePromise<{
  items: I[];
  meta: {
    currentPage: number;
    itemCount: number;
    itemsPerPage: number;
    totalItems: number;
    totalPages: number;
  };
}>;