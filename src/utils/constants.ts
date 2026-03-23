/* eslint-disable max-len */
import { TokenPriceMovementDto } from '@/api/generated/models/TokenPriceMovementDto';
import {
  CURRENT_NETWORK_CONFIG,
  NETWORKS,
} from '../config';
import { ICurrency, INetwork } from './types';

function toNetwork(network: typeof CURRENT_NETWORK_CONFIG): INetwork {
  return {
    name: network.name,
    networkId: network.NETWORK,
    apiUrl: network.SUPERHERO_API_URL || network.BACKEND_URL,
    websocketUrl: network.websocketUrl,
    url: network.NODE_URL,
    middlewareUrl: network.MIDDLEWARE_URL,
    explorerUrl: network.EXPLORER_URL || '',
    compilerUrl: network.compilerUrl,
    superheroBackendUrl: network.superheroBackendUrl,
    disabled: network.disabled,
  };
}

/**
 * Default `networkId` values returned by the Node after establishing the connection.
 * Nodes returns different values when connecting to the Hyperchains.
 */
const NETWORK_ID_MAINNET = 'ae_mainnet';
export const NETWORK_MAINNET: INetwork = toNetwork(NETWORKS[NETWORK_ID_MAINNET]);

/** Network config for the current build (mainnet or testnet; VITE_NETWORK selects ae_mainnet vs ae_uat). */
export const CURRENT_NETWORK: INetwork = toNetwork(CURRENT_NETWORK_CONFIG);

export const DATE_LONG = 'YYYY-MM-DD HH:mm';

export const IS_FRAMED_AEPP = window.parent !== window;
export const IS_MOBILE = window.navigator.userAgent.includes('Mobi');
export const IS_SAFARI = /Mozilla\/5.0 \((Macintosh|iPad|iPhone|iPod); [\s\S]+?\) AppleWebKit\/\S+ \(KHTML, like Gecko\)( (Version|Safari|Mobile)\/\S+)+/.test(
  navigator.userAgent,
);

export const COIN_SYMBOL = 'AE';

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
    name: 'Chinese Yuan',
    code: 'cny',
    symbol: '¥',
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
  buy: 'buy',
  sell: 'sell',
  create_community: 'create_community',
  register_invitation_code: 'register_invitation_code',
  revoke_invitation_code: 'revoke_invitation_code',
  redeem_invitation_code: 'redeem_invitation_code',

  transfer: 'transfer',
  mint: 'mint',
  burn: 'burn',
} as const;

export const WEB_SOCKET_CHANNELS = {
  TokenCreated: 'token-created',
  TokenUpdated: 'token-updated',
  TokenTransaction: 'token-transaction',
  TokenHistory: 'token-history',
};

export const WEB_SOCKET_RECONNECT_TIMEOUT = 1000;

export const PRICE_MOVEMENT_TIMEFRAMES = ['1d', '7d', '30d'] as const;
export type PriceMovementTimeframe = (typeof PRICE_MOVEMENT_TIMEFRAMES)[number];

export const PRICE_MOVEMENT_TIMEFRAME_DEFAULT: PriceMovementTimeframe = '30d';

export const DEFAULT_PAST_TIMEFRAME: keyof TokenPriceMovementDto = `past_${PRICE_MOVEMENT_TIMEFRAME_DEFAULT}`;

export const PRICE_MOVEMENT_TIMEFRAME_TEXT: Record<string, string> = {
  'all-time': 'All Time',
  '30d': '30 DAY',
  '7d': '7 DAY',
  '1d': '1 DAY',
};

export const PROTOCOL_DAO_AFFILIATION_FEE = 0.05;
export const PROTOCOL_DAO_TOKEN_AE_RATIO = 1000;
