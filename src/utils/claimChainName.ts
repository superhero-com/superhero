import {
  Tag,
  buildTx,
  commitmentHash,
  getExecutionCost,
  getMinimumNameFee,
  unpackTx,
} from '@aeternity/aepp-sdk';
import BigNumber from 'bignumber.js';
import type { ChainNameClaimStatusResponse } from '@/api/backend';

export type ClaimNotificationStep = 'wallet' | 'queued' | 'preclaim' | 'claim' | 'update' | 'transfer';

const stripApiErrorPrefix = (value: string) => value.replace(/^superhero api error \(\d+\):\s*/iu, '').trim();

export const CLAIMABLE_CHAIN_NAME_LABEL_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

// Stub values used to build throwaway transactions purely for fee/cost estimation.
const STUB_ADDRESS: `ak_${string}` = 'ak_11111111111111111111111111111111273Yts';
const STUB_NONCE = 1;
const STUB_NAME_SALT = 4204563566073083;
const AE_COIN_PRECISION = 18;

/**
 * Total cost (in AE) the user pays to claim a name themselves: the preclaim transaction fee
 * plus the claim execution cost (which includes the minimum name fee). Mirrors the Superhero
 * Wallet's own claim screen so the displayed price matches what the wallet will charge.
 */
export const computeSelfFundedClaimAe = (fullName: `${string}.chain`): BigNumber => BigNumber(
  unpackTx(
    buildTx({
      tag: Tag.NamePreclaimTx,
      accountId: STUB_ADDRESS,
      nonce: STUB_NONCE,
      commitmentId: commitmentHash(fullName, STUB_NAME_SALT),
    }),
    Tag.NamePreclaimTx,
  ).fee,
)
  .plus(
    getExecutionCost(
      buildTx({
        tag: Tag.NameClaimTx,
        accountId: STUB_ADDRESS,
        nonce: STUB_NONCE,
        name: fullName,
        nameSalt: 0,
        nameFee: getMinimumNameFee(fullName),
      }),
    ).toString(),
  )
  .shiftedBy(-AE_COIN_PRECISION);

export const resolveClaimErrorMessage = (
  claimError: unknown,
  t: (key: string) => string,
) => {
  const rawMessage = claimError instanceof Error ? claimError.message : String(claimError || '');
  const msg = stripApiErrorPrefix(rawMessage);
  const lower = msg.toLowerCase();

  if (
    lower.includes('429')
    || lower.includes('rate limit')
    || lower.includes('too many')
  ) return t('messages.tooManyRequests');

  if (
    lower.includes('rejected')
    || lower.includes('denied')
    || lower.includes('cancelled')
    || lower.includes('canceled')
  ) return t('messages.chainNameClaimRejected');

  if (lower.includes('timed out')) return t('messages.chainNameClaimTimedOut');

  if (
    lower.includes('connect your wallet')
    || lower.includes('connect the wallet for this profile')
    || lower.includes('you are not connected to wallet')
    || lower.includes('you are not subscribed for an account')
    || lower.includes('do not have access to account')
  ) return t('messages.connectWalletToClaimChainName');

  if (lower.includes('wallet message signing is not available')) {
    return t('messages.chainNameClaimWalletUnavailable');
  }

  if (
    lower.includes('already taken on-chain')
    || lower.includes('name is already taken')
  ) return t('messages.chainNameClaimNameTaken');

  if (lower.includes('already being claimed by another address')) {
    return t('messages.chainNameClaimNameInProgress');
  }

  if (lower.includes('already has an in-progress chain name claim')) {
    return t('messages.chainNameClaimAddressInProgress');
  }

  if (lower.includes('already has a claimed chain name')) {
    return t('messages.chainNameClaimAddressClaimed');
  }

  if (
    lower.includes('challenge has expired')
    || lower.includes('challenge expiry mismatch')
  ) return t('messages.chainNameClaimChallengeExpired');

  if (
    lower.includes('shorter than 13')
    || lower.includes('too short')
    || lower.includes('more than 12 characters')
  ) return t('messages.chainNameClaimTooShort');

  if (
    lower.includes('invalid challenge signature')
    || lower.includes('challenge proof is required')
  ) return t('messages.chainNameClaimVerificationFailed');

  if (
    lower.includes('claiming is not available at this time')
    || lower.includes('temporarily unavailable due to insufficient sponsor funds')
    || lower.includes('temporarily unavailable')
    || lower.includes('unable to verify chain name availability right now')
  ) return t('messages.chainNameClaimUnavailable');

  if (
    lower.includes('invalid address')
    || lower.includes('bad request')
  ) return t('messages.chainNameClaimRetry');

  return t('messages.chainNameClaimFailed');
};

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
