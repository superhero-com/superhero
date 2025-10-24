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
    // Theme the WalletConnect/AppKit modal to match Superhero UI
    // Reference: https://docs.reown.com/appkit/ui/customization
    themeVariables: {
        // Typography
        '--w3m-font-family': "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
        '--w3m-font-size-master': '14px',
        '--w3m-border-radius-master': '12px',

        // Brand colors aligned with app accents
        '--w3m-color-mix': '#1161FE',
        '--w3m-color-mix-strength': 15,
        '--w3m-accent': '#1161FE',
        '--w3m-accent-fill-color': '#0a0a0f',

        // Surfaces to match dark glassy background
        '--w3m-background-color': '#0a0a0f',
        '--w3m-background-image-url': 'none',
        '--w3m-color-bg-1': '#12121a',
        '--w3m-color-bg-2': '#0f0f18',
        '--w3m-color-overlay': 'rgba(0,0,0,0.6)',

        // Text
        '--w3m-color-fg-1': '#f8fafc',
        '--w3m-color-fg-2': '#94a3b8',

        // Borders and shadows
        '--w3m-color-border': 'rgba(255,255,255,0.08)',
        '--w3m-color-overlay-lighter': 'rgba(255,255,255,0.06)',
        '--w3m-shadow': '0 16px 48px rgba(0,0,0,0.45)',
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

