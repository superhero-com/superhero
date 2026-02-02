import React, { ReactNode, useEffect, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { WalletConnectWalletAdapter } from '@walletconnect/solana-adapter';
import { clusterApiUrl } from '@solana/web3.js';
import '@solana/wallet-adapter-react-ui/styles.css';
import WebSocketClient from '@/libs/WebSocketClient';
import { CONFIG } from '@/config';

interface SolanaWalletProviderProps {
  children: ReactNode;
}

export const SolanaWalletProvider = ({ children }: SolanaWalletProviderProps) => {
  const network = (import.meta.env.VITE_SOLANA_CLUSTER as WalletAdapterNetwork)
    ?? WalletAdapterNetwork.Devnet;

  const endpoint = import.meta.env.VITE_SOLANA_RPC_URL ?? clusterApiUrl(network);

  const walletConnectProjectId: string | undefined = (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string | undefined)
    || (import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID as string | undefined)
    || (typeof process !== 'undefined'
      ? ((process.env as any).VITE_WALLETCONNECT_PROJECT_ID as string | undefined)
        || ((process.env as any).VITE_WALLET_CONNECT_PROJECT_ID as string | undefined)
      : undefined);

  if (typeof window !== 'undefined' && !walletConnectProjectId) {
    // eslint-disable-next-line no-console
    console.warn(
      'Solana WalletConnect is disabled: WALLET_CONNECT_PROJECT_ID (or VITE_WALLETCONNECT_PROJECT_ID) is not configured.',
    );
  }

  const wallets = useMemo(() => {
    const isMobile = typeof window !== 'undefined' && (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      || (navigator.maxTouchPoints > 0 && window.innerWidth < 768)
    );

    const baseWallets: (
      PhantomWalletAdapter | SolflareWalletAdapter | WalletConnectWalletAdapter
    )[] = [];

    if (!isMobile) {
      baseWallets.push(
        new PhantomWalletAdapter(),
        new SolflareWalletAdapter({ network }),
      );
    }

    if (walletConnectProjectId) {
      if (typeof window === 'undefined') {
        // eslint-disable-next-line no-console
        console.warn(
          'Skipping Solana WalletConnect adapter initialization because window is undefined (likely SSR).',
        );
      } else {
        baseWallets.push(
          new WalletConnectWalletAdapter({
            network: network as WalletAdapterNetwork.Mainnet | WalletAdapterNetwork.Devnet,
            options: {
              projectId: walletConnectProjectId,
              relayUrl: 'wss://relay.walletconnect.com',
              metadata: {
                name: 'Superhero Solana BCL',
                description:
                  'Superhero Solana BCL lets you launch bonding-curve tokens on Solana and (optionally) connect an Ethereum wallet via WalletConnect for cross‑chain flows.',
                url: window.location.origin,
                icons: [`${window.location.origin}/og-default.png`],
              },
            },
          }),
        );
      }
    }

    return baseWallets;
  }, [network, walletConnectProjectId]);

  useEffect(() => {
    WebSocketClient.disconnect();
    WebSocketClient.connect(CONFIG.SUPERHERO_WS_URL);

    return () => {
      WebSocketClient.disconnect();
    };
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider
        wallets={wallets}
        autoConnect
        onError={(error) => {
          // eslint-disable-next-line no-console
          console.error('Solana wallet adapter error', error);
        }}
      >
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
