import { createAppKit } from '@reown/appkit/react';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import { AppKitNetwork, mainnet, sepolia } from '@reown/appkit/networks';
import { BRIDGE_CONSTANTS } from '../constants';

const projectId = '969e93fa16b810b9f5c0f2771bb6fc95';

// Use mainnet based on bridge configuration - default to mainnet
const isMainnet = BRIDGE_CONSTANTS.CHAIN_ID_HEX === '0x1';
const networks = isMainnet 
    ? [mainnet] as [AppKitNetwork, ...AppKitNetwork[]]
    : [sepolia] as [AppKitNetwork, ...AppKitNetwork[]];

const metadata = {
    name: 'Superhero',
    description: 'Superhero - Buy AE with ETH',
    url: 'https://superhero.com/',
    icons: [],
};

createAppKit({
    adapters: [new EthersAdapter()],
    networks,
    metadata,
    projectId,
    themeVariables: {
        '--w3m-color-mix': '#f5274e',
        '--w3m-color-mix-strength': 10,
        '--w3m-font-family': 'ClashDisplay-Variable',
        '--w3m-border-radius-master': '.5px',
    },
    features: {
        analytics: false,
        email: false,
        socials: false,
        swaps: false,
        onramp: false,
    },
});

export function AppKitProvider({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}

