/**
 * Whether the onboarding "Pick your .chain name" step should be offered to an
 * account. It is offered once per account on this device: "Later" (or closing
 * the dialog) remembers the choice, and the profile editor keeps the claim path.
 */
import { AccountsService } from '@/api/generated/services/AccountsService';

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
