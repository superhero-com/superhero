import type { ChainNameClaimStatusResponse } from '@/api/backend';

export type ClaimNotificationStep = 'wallet' | 'queued' | 'preclaim' | 'claim' | 'update' | 'transfer';

export const resolveClaimNotificationStep = (
  claimStatus?: ChainNameClaimStatusResponse | null,
): ClaimNotificationStep => {
  const statusValue = String(claimStatus?.status || '').toLowerCase();
  if (statusValue.includes('transfer')) return 'transfer';
  if (statusValue.includes('update')) return 'update';
  if (statusValue.includes('preclaim')) return 'preclaim';
  if (statusValue.includes('claim')) return 'claim';
  if (claimStatus?.transfer_tx_hash) return 'transfer';
  if (claimStatus?.update_tx_hash) return 'update';
  if (claimStatus?.claim_tx_hash) return 'claim';
  if (claimStatus?.preclaim_tx_hash) return 'preclaim';
  return 'queued';
};
