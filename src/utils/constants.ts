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