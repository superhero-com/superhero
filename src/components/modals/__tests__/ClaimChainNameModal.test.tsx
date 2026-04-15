import { describe, expect, it } from 'vitest';
import { resolveClaimErrorMessage } from '../ClaimChainNameModal';

const messages: Record<string, string> = {
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
};

const t = (key: string) => messages[key] || key;

describe('resolveClaimErrorMessage', () => {
  it('maps name availability conflicts to friendly copy', () => {
    expect(resolveClaimErrorMessage(
      new Error('Superhero API error (400): This name is already taken on-chain'),
      t,
    )).toBe(messages['messages.chainNameClaimNameTaken']);

    expect(resolveClaimErrorMessage(
      new Error('Superhero API error (409): This name is already being claimed by another address'),
      t,
    )).toBe(messages['messages.chainNameClaimNameInProgress']);
  });

  it('maps address-specific conflicts to friendly copy', () => {
    expect(resolveClaimErrorMessage(
      new Error('Superhero API error (409): Address already has an in-progress chain name claim: abc.chain'),
      t,
    )).toBe(messages['messages.chainNameClaimAddressInProgress']);

    expect(resolveClaimErrorMessage(
      new Error('Superhero API error (409): Address already has a claimed chain name: abc.chain'),
      t,
    )).toBe(messages['messages.chainNameClaimAddressClaimed']);
  });

  it('maps challenge and signature issues to retryable copy', () => {
    expect(resolveClaimErrorMessage(
      new Error('Superhero API error (400): Challenge has expired'),
      t,
    )).toBe(messages['messages.chainNameClaimChallengeExpired']);

    expect(resolveClaimErrorMessage(
      new Error('Superhero API error (400): Invalid challenge signature'),
      t,
    )).toBe(messages['messages.chainNameClaimVerificationFailed']);
  });

  it('maps temporary backend availability issues to generic unavailable copy', () => {
    expect(resolveClaimErrorMessage(
      new Error('Superhero API error (503): Chain name claiming is temporarily unavailable due to insufficient sponsor funds'),
      t,
    )).toBe(messages['messages.chainNameClaimUnavailable']);

    expect(resolveClaimErrorMessage(
      new Error('Superhero API error (503): Unable to verify chain name availability right now'),
      t,
    )).toBe(messages['messages.chainNameClaimUnavailable']);
  });

  it('maps rate limits and unknown backend errors safely', () => {
    expect(resolveClaimErrorMessage(
      new Error('Superhero API error (429): Too many requests'),
      t,
    )).toBe(messages['messages.tooManyRequests']);

    expect(resolveClaimErrorMessage(
      new Error('Superhero API error (400): Invalid address'),
      t,
    )).toBe(messages['messages.chainNameClaimRetry']);

    expect(resolveClaimErrorMessage(
      new Error('Superhero API error (500): unexpected internal stack trace'),
      t,
    )).toBe(messages['messages.chainNameClaimFailed']);
  });
});
