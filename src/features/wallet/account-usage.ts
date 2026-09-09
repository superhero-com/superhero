import { CURRENT_NETWORK } from '@/utils/constants';

export type AccountUsage = 'used' | 'pristine' | 'unknown';

/**
 * Whether `address` has ever been seen on chain — the recovery confirm screen's
 * wrong-wallet signal (`deriveRecoveredWallet` explains how a wrong pick derives
 * a valid but pristine account).
 *
 * Only a 404 means pristine. A network failure is 'unknown', which the UI must
 * show as "couldn't verify" — never as a warning, and never as a block.
 */
export async function checkAccountUsage(address: string): Promise<AccountUsage> {
  try {
    // Bounded because the answer is advisory: an unreachable node has to settle as
    // 'unknown', not leave the confirm screen saying "checking" forever.
    const res = await fetch(`${CURRENT_NETWORK.url}/v3/accounts/${address}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) return 'used';
    if (res.status === 404) return 'pristine';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}
