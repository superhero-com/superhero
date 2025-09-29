import configs from "../configs";
import { INetwork, ICurrency } from "./types";

/**
 * Default `networkId` values returned by the Node after establishing the connection.
 * Nodes returns different values when connecting to the Hyperchains.
 */
export const NETWORK_ID_MAINNET = "ae_mainnet";
export const NETWORK_ID_TESTNET = "ae_uat";

export const NETWORK_TESTNET: INetwork = configs.networks[NETWORK_ID_TESTNET];
export const NETWORK_MAINNET: INetwork = configs.networks[NETWORK_ID_MAINNET];

export const DATE_LONG = "YYYY-MM-DD HH:mm";
export const DATE_FULL = "YYYY-MM-DD HH:mm:ss";
export const TIME_FULL = "HH:mm:ss";



export const IS_FRAMED_AEPP = window.parent !== window;
export const IS_MOBILE = window.navigator.userAgent.includes("Mobi");
export const IS_SAFARI =
  /Mozilla\/5.0 \((Macintosh|iPad|iPhone|iPod); [\s\S]+?\) AppleWebKit\/\S+ \(KHTML, like Gecko\)( (Version|Safari|Mobile)\/\S+)+/.test(
    navigator.userAgent,
  );

export const COIN_SYMBOL = 'AE';
export const AETERNITY_TOKEN_BASE_DATA = {
    address: 'aeternity',
    decimals: 18, // Amount of decimals
    name: 'Aeternity',
    symbol: COIN_SYMBOL,
  } as const;

  export const CURRENCIES: ICurrency[] = [
    {
      name: 'United States Dollar',
      code: 'usd',
      symbol: '$',
    },
    {
      name: 'Euro',
      code: 'eur',
      symbol: '€',
    },
    {
      name: 'Australia Dollar',
      code: 'aud',
      symbol: 'AU$',
    },
    {
      name: 'Brasil Real',
      code: 'brl',
      symbol: 'R$',
    },
    {
      name: 'Canada Dollar',
      code: 'cad',
      symbol: 'CA$',
    },
    {
      name: 'Swiss Franc',
      code: 'chf',
      symbol: 'CHF',
    },
    {
      name: 'United Kingdom Pound',
      code: 'gbp',
      symbol: '£',
    },
    {
      name: 'Gold Ounce',
      code: 'xau',
      symbol: 'XAU',
    },
  ];

  export const INVITATIONS_CONTRACT = 'ct_2GG42rs2FDPTXuUCWHMn98bu5Ab6mgNxY7KdGAKUNsrLqutNxZ';

  export const TX_FUNCTIONS = {
    buy: "buy",
    sell: "sell",
    create_community: "create_community",
    register_invitation_code: "register_invitation_code",
    redeem_invitation_code: "redeem_invitation_code",

    transfer: "transfer",
    mint: "mint",
    burn: "burn",
  } as const;

  export const WEB_SOCKET_CHANNELS = {
    TokenCreated: "token-created",
    TokenUpdated: "token-updated",
    TokenTransaction: "token-transaction",
    TokenHistory: "token-history",
  };

  export const WEB_SOCKET_RECONNECT_TIMEOUT = 1000;



export const PRICE_MOVEMENT_TIMEFRAMES = ["1d", "7d", "30d"] as const;
export type PriceMovementTimeframe = (typeof PRICE_MOVEMENT_TIMEFRAMES)[number];

export const PRICE_MOVEMENT_TIMEFRAME_DEFAULT: PriceMovementTimeframe = "30d";
