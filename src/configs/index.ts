import type { IAppConfigs } from "../utils/types";

export const configs: IAppConfigs = {
  app: {
    // name: process.env.VUE_APP_NAME || "",
    name: "Superhero",
    logo: {
      width: "187px",
      height: "30px",
    },
    allowSwitchTheme: false,
  },
  wallet: {
    name: "Superhero Wallet",
    url: "https://wallet.superhero.com",
  },
  networks: {
    ae_mainnet: {
      name: "Mainnet",
      networkId: "ae_mainnet",
      apiUrl: process.env.VUE_APP_MAINNET_API || "https://api.dev.tokensale.org/",
      websocketUrl: process.env.VUE_APP_MAINNET_WS || "https://api.dev.tokensale.org/",
      url: "https://mdw.wordcraft.fun",
      middlewareUrl: "https://mdw.wordcraft.fun/mdw",
      explorerUrl: "https://aescan.io",
      compilerUrl: "https://v7.compiler.aepps.com",
      superheroBackendUrl:
        "https://superhero-backend-mainnet.prd.service.aepps.com",
      disabled: true,
    },
    ae_uat: {
      name: "Testnet",
      networkId: "ae_uat",
      apiUrl: process.env.VUE_APP_TESTNET_API || "",
      websocketUrl: process.env.VUE_APP_TESTNET_WS || "",
      url: "https://testnet.aeternity.io",
      middlewareUrl: "https://testnet.aeternity.io/mdw",
      explorerUrl: "https://testnet.aescan.io",
      compilerUrl: "https://v7.compiler.aepps.com",
      superheroBackendUrl:
        "https://superhero-backend-testnet.prd.service.aepps.com",
    },
  },
//   languages: ["en"],
  avatarServiceUrl: "https://avatars.superherowallet.com/",

  features: {
    trendminer: false,
  }
};

export default configs;
