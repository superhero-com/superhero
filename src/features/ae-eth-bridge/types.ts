export interface Asset {
    aeAddress: string;
    ethAddress: string;
    nameandsymbol: string;
    name: string;
    symbol: string;
    decimals: number;
    icon: string;
}

export interface AssetInfo {
    address: string;
    balance: string;
}

export interface AeternityAssetInfo {
    asset?: AssetInfo;
}

export interface EthereumAssetInfo {
    asset?: AssetInfo;
}

export interface BridgeInfo {
    isEnabled?: boolean;
    areFundsSufficient?: boolean;
}

export enum Direction {
    AeternityToEthereum = 'aeternity-ethereum',
    EthereumToAeternity = 'ethereum-aeternity',
    Both = 'both',
}

export interface BridgeAction {
    direction: Direction;
    asset: Asset;
    amount: string;
    destination: string;
    allowanceTxHash: string;
    bridgeTxHash: string;
}

export const BRIDGE_TOKEN_ACTION_TYPE = 0;
export const BRIDGE_ETH_ACTION_TYPE = 1;
export const BRIDGE_AETERNITY_ACTION_TYPE = 2;


