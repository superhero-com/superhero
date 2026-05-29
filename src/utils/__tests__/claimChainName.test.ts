import { describe, expect, it } from 'vitest';
import { resolveClaimNotificationStep } from '@/utils/claimChainName';

describe('resolveClaimNotificationStep', () => {
  it('maps preclaim status before claim substring (regression)', () => {
    expect(resolveClaimNotificationStep({ status: 'preclaim_pending' })).toBe('preclaim');
    expect(resolveClaimNotificationStep({ status: 'PRECLAIM_PENDING' })).toBe('preclaim');
  });

  it('maps distinct pipeline steps from status text', () => {
    expect(resolveClaimNotificationStep({ status: 'claim_pending' })).toBe('claim');
    expect(resolveClaimNotificationStep({ status: 'update_pending' })).toBe('update');
    expect(resolveClaimNotificationStep({ status: 'transfer_pending' })).toBe('transfer');
    expect(resolveClaimNotificationStep({ status: 'queued' })).toBe('queued');
  });

  it('falls back to tx hashes when status is generic', () => {
    expect(resolveClaimNotificationStep({
      status: 'processing',
      preclaim_tx_hash: 'th_pre',
    })).toBe('preclaim');
    expect(resolveClaimNotificationStep({
      status: 'processing',
      preclaim_tx_hash: 'th_pre',
      claim_tx_hash: 'th_claim',
    })).toBe('claim');
    expect(resolveClaimNotificationStep({
      status: 'processing',
      preclaim_tx_hash: 'th_pre',
      claim_tx_hash: 'th_claim',
      update_tx_hash: 'th_update',
    })).toBe('update');
    expect(resolveClaimNotificationStep({
      status: 'processing',
      transfer_tx_hash: 'th_transfer',
      preclaim_tx_hash: 'th_pre',
    })).toBe('transfer');
  });

  it('prefers transfer status over earlier tx hashes', () => {
    expect(resolveClaimNotificationStep({
      status: 'transfer_pending',
      preclaim_tx_hash: 'th_pre',
      claim_tx_hash: 'th_claim',
    })).toBe('transfer');
  });
});
