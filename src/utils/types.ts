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
}