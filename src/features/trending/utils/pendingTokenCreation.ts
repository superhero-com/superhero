import { TokensService } from '@/api/generated';
import { usePendingTransactionsVersion } from '@/features/pending-transactions/usePendingTransactions';
import {
  findPendingTransaction,
  registerPendingTransactionResolver,
  trackPendingTransaction,
  type PendingTransaction,
} from '@/features/pending-transactions/store';
import { toTokenLookupParam } from '@/utils/address';

// Live once the backend has the token with its sale contract: that is what
// the token page, the lists and trading all need. Before then the lookup
// 404s, which counts as "not yet".
registerPendingTransactionResolver('create_token', async (transaction) => {
  const tokenName = transaction.meta.tokenName ?? '';
  if (!tokenName) return undefined;
  const token: any = await TokensService.findByAddress({ address: toTokenLookupParam(tokenName) });
  return token?.sale_address ? { saleAddress: String(token.sale_address) } : undefined;
});

/** Follow a broadcast token creation until the token is live. */
export function trackTokenCreation(
  account: string,
  txHash: string,
  tokenName: string,
): PendingTransaction {
  return trackPendingTransaction({
    kind: 'create_token',
    account,
    txHash,
    meta: { tokenName },
  });
}

const sameToken = (a: string | null | undefined, b: string | null | undefined) => (
  Boolean(a && b) && a!.toLowerCase() === b!.toLowerCase()
);

/** The creation of `tokenName` still on its way, if any. */
export function pendingTokenCreation(
  tokenName: string | null | undefined,
): PendingTransaction | null {
  if (!tokenName) return null;
  return findPendingTransaction({
    kind: 'create_token',
    match: (transaction) => sameToken(transaction.meta.tokenName, tokenName),
  });
}

/**
 * The page-level check for a token page: whether this token's creation is
 * still on its way, from this visit or one before it, kept current as it moves.
 */
export function usePendingTokenCreation(
  tokenName: string | null | undefined,
): PendingTransaction | null {
  usePendingTransactionsVersion();
  return pendingTokenCreation(tokenName);
}
