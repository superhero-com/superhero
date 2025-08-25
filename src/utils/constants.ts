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