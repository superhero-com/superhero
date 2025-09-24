import configs from "../configs";
import { INetwork } from "./types";

/**
 * Default `networkId` values returned by the Node after establishing the connection.
 * Nodes returns different values when connecting to the Hyperchains.
 */
export const NETWORK_ID_MAINNET = "ae_mainnet";
export const NETWORK_ID_TESTNET = "ae_uat";

export const NETWORK_TESTNET: INetwork = configs.networks[NETWORK_ID_TESTNET];
export const NETWORK_MAINNET: INetwork = configs.networks[NETWORK_ID_MAINNET];

const isBrowser = typeof window !== "undefined" && typeof navigator !== "undefined";

export const IS_FRAMED_AEPP = isBrowser ? window.parent !== window : false;
export const IS_MOBILE = isBrowser ? window.navigator.userAgent.includes("Mobi") : false;
export const IS_SAFARI = isBrowser
  ? /Mozilla\/5.0 \((Macintosh|iPad|iPhone|iPod); [\s\S]+?\) AppleWebKit\/\S+ \(KHTML, like Gecko\)( (Version|Safari|Mobile)\/\S+)+/.test(
      window.navigator.userAgent,
    )
  : false;