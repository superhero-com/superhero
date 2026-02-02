import { useMemo } from 'react';
import { connect } from 'solana-kite';

export function useSolanaKit() {
  const cluster = (import.meta.env.VITE_SOLANA_CLUSTER as string | undefined)?.toLowerCase()
    ?? 'devnet';

  const connection = useMemo(() => connect(cluster), [cluster]);

  return {
    connection,
    rpc: connection.rpc,
    rpcSubscriptions: connection.rpcSubscriptions,
  };
}
