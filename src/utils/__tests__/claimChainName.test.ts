import { describe, expect, it } from 'vitest';
import { resolveClaimErrorMessage, resolveClaimNotificationStep } from '@/utils/claimChainName';

const errorMessages: Record<string, string> = {
  'messages.tooManyRequests': 'Too many requests. Please wait and try again.',
  'messages.connectWalletToClaimChainName': 'Connect your wallet to claim a .chain name',
  'messages.chainNameClaimTimedOut': 'The claim is still processing. Please check back in a moment.',
  'messages.chainNameClaimWalletUnavailable': 'Wallet message signing is not available right now. Please try again.',
  'messages.chainNameClaimNameTaken': 'That .chain name is already taken. Try another one.',
  'messages.chainNameClaimNameInProgress': 'That .chain name is currently being claimed. Try another one.',
  'messages.chainNameClaimAddressInProgress': 'You already have a sponsored .chain claim in progress.',
  'messages.chainNameClaimAddressClaimed': 'This wallet already has a sponsored .chain name.',
  'messages.chainNameClaimChallengeExpired': 'Your claim session expired. Please try again.',
  'messages.chainNameClaimVerificationFailed': 'We could not verify your wallet signature. Please try again.',
  'messages.chainNameClaimUnavailable': 'Sponsored .chain claiming is temporarily unavailable. Please try again later.',
  'messages.chainNameClaimRetry': 'We could not start the .chain claim. Please try again.',
  'messages.chainNameClaimFailed': 'Failed to claim .chain name.',
  'messages.chainNameClaimRejected': 'You declined the request in your wallet. Please try again.',
};

const t = (key: string) => errorMessages[key] || key;

describe('resolveClaimErrorMessage', () => {
  it('maps name availability conflicts to friendly copy', () => {
    expect(resolveClaimErrorMessage(
      new Error('Superhero API error (400): This name is already taken on-chain'),
      t,
    )).toBe(errorMessages['messages.chainNameClaimNameTaken']);

    expect(resolveClaimErrorMessage(
      new Error('Superhero API error (409): This name is already being claimed by another address'),
      t,
    )).toBe(errorMessages['messages.chainNameClaimNameInProgress']);
  });

  it('maps address-specific conflicts to friendly copy', () => {
    expect(resolveClaimErrorMessage(
      new Error('Superhero API error (409): Address already has an in-progress chain name claim: abc.chain'),
      t,
    )).toBe(errorMessages['messages.chainNameClaimAddressInProgress']);

    expect(resolveClaimErrorMessage(
      new Error('Superhero API error (409): Address already has a claimed chain name: abc.chain'),
      t,
    )).toBe(errorMessages['messages.chainNameClaimAddressClaimed']);
  });

  it('maps challenge and signature issues to retryable copy', () => {
    expect(resolveClaimErrorMessage(
      new Error('Superhero API error (400): Challenge has expired'),
      t,
    )).toBe(errorMessages['messages.chainNameClaimChallengeExpired']);

    expect(resolveClaimErrorMessage(
      new Error('Superhero API error (400): Invalid challenge signature'),
      t,
    )).toBe(errorMessages['messages.chainNameClaimVerificationFailed']);
  });

  it('maps temporary backend availability issues to generic unavailable copy', () => {
    expect(resolveClaimErrorMessage(
      new Error('Superhero API error (503): Chain name claiming is temporarily unavailable due to insufficient sponsor funds'),
      t,
    )).toBe(errorMessages['messages.chainNameClaimUnavailable']);

    expect(resolveClaimErrorMessage(
      new Error('Superhero API error (503): Unable to verify chain name availability right now'),
      t,
    )).toBe(errorMessages['messages.chainNameClaimUnavailable']);
  });

  it('maps wallet mismatch and timeout copy', () => {
    expect(resolveClaimErrorMessage(
      new Error('Connect the wallet for this profile to claim a .chain name'),
      t,
    )).toBe(errorMessages['messages.connectWalletToClaimChainName']);

    expect(resolveClaimErrorMessage(
      new Error('Timed out while waiting for .chain name claim to finish'),
      t,
    )).toBe(errorMessages['messages.chainNameClaimTimedOut']);
  });

  it('maps user rejection to dedicated copy, not the unavailable message', () => {
    expect(resolveClaimErrorMessage(
      new Error('Rejected by user'),
      t,
    )).toBe(errorMessages['messages.chainNameClaimRejected']);
  });

  it('maps rate limits and unknown backend errors safely', () => {
    expect(resolveClaimErrorMessage(
      new Error('Superhero API error (429): Too many requests'),
      t,
    )).toBe(errorMessages['messages.tooManyRequests']);

    expect(resolveClaimErrorMessage(
      new Error('Superhero API error (400): Invalid address'),
      t,
    )).toBe(errorMessages['messages.chainNameClaimRetry']);

    expect(resolveClaimErrorMessage(
      new Error('Superhero API error (500): unexpected internal stack trace'),
      t,
    )).toBe(errorMessages['messages.chainNameClaimFailed']);
  });
});

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
