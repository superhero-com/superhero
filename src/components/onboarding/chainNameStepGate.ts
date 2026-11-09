/**
 * Whether the onboarding "Pick your .chain name" step should be offered to an
 * account. It is offered once per account on this device: "Later" (or closing
 * the dialog) remembers the choice, and the profile editor keeps the claim path.
 */
import { AccountsService } from '@/api/generated/services/AccountsService';
import { SuperheroApi } from '@/api/backend';

export const CHAIN_NAME_STEP_DISMISSED_KEY_PREFIX = 'sh:chain-name-step-dismissed:';

const storageKey = (address: string) => `${CHAIN_NAME_STEP_DISMISSED_KEY_PREFIX}${address}`;

export function isChainNameStepDismissed(address: string): boolean {
  try {
    return window.localStorage.getItem(storageKey(address)) === '1';
  } catch {
    return false;
  }
}

export function dismissChainNameStep(address: string): void {
  try {
    window.localStorage.setItem(storageKey(address), '1');
  } catch {
    // Storage can be blocked; the step then shows again next time.
  }
}

const hasChainNameValue = (value: unknown) => String(value || '').trim().toLowerCase().endsWith('.chain');

/**
 * True when the account owns a .chain name, false when it owns none, and null
 * when that could not be read. Callers skip the step on null: onboarding must
 * never wait on this lookup.
 */
export async function accountHasChainName(address: string): Promise<boolean | null> {
  try {
    const names = await AccountsService.getChainNamesForAddresses({
      addresses: address,
    }) as Record<string, string | null> | null;
    return hasChainNameValue(names?.[address]);
  } catch {
    return null;
  }
}

export const knownChainName = (...values: unknown[]) => values.some(hasChainNameValue);

// The shortest name the step accepts (13 characters) costs the most, so if the
// sponsor can pay for it, it can pay for any name typed here.
const FREE_OFFER_PROBE_LABEL = 'a'.repeat(13);
let freeOfferRequest: Promise<boolean> | null = null;

/**
 * Whether new names are free right now (the sponsor can pay the claim). Read
 * once per page load and shared, so the modal can start it while the wallet
 * finishes and the step reads the same answer. False when it can't be read:
 * the step then makes no "free" promise.
 */
export function getFreeClaimOffer(): Promise<boolean> {
  if (!freeOfferRequest) {
    freeOfferRequest = SuperheroApi.checkChainNameSponsorship(FREE_OFFER_PROBE_LABEL)
      .then((res) => res?.sponsorable === true)
      .catch(() => {
        freeOfferRequest = null;
        return false;
      });
  }
  return freeOfferRequest;
}

/** Test hook: forget the cached answer. */
export const resetFreeClaimOffer = () => { freeOfferRequest = null; };
