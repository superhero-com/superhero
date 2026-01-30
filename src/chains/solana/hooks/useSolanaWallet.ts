import { useMemo } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

export function useSolanaWallet() {
  const { connection } = useConnection();
  const {
    publicKey,
    connected,
    connecting,
    disconnecting,
    wallets,
    select,
    connect,
    disconnect,
    sendTransaction,
    signTransaction,
    signAllTransactions,
    signMessage,
  } = useWallet();

  const address = useMemo(
    () => (publicKey ? publicKey.toBase58() : undefined),
    [publicKey],
  );

  return {
    connection,
    address,
    publicKey,
    connected,
    connecting,
    disconnecting,
    wallets,
    select,
    connect,
    disconnect,
    sendTransaction,
    signTransaction,
    signAllTransactions,
    signMessage,
  };
}
