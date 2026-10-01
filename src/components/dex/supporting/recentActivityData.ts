import type { RecentActivity, TransactionStatus } from '../types/dex';

export function activityStatus(status?: TransactionStatus | null) {
  if (status?.failed) return 'failed';
  if (status?.confirmed) return 'confirmed';
  if (status?.pending) return 'pending';
  return 'unknown';
}

export function activityAmount(amount: string | undefined, locale: string) {
  if (amount === undefined || amount.trim() === '') return '—';
  const value = Number(amount);
  if (!Number.isFinite(value) || value < 0) return '—';
  return new Intl.NumberFormat(locale, { maximumSignificantDigits: 6 }).format(value);
}

export const activityKey = (activity: RecentActivity) => (
  `${activity.account}:${activity.hash || ''}:${activity.timestamp}:${activity.type}`
);

export function sameActivityStatus(a?: TransactionStatus | null, b?: TransactionStatus | null) {
  return a?.confirmed === b?.confirmed && a?.pending === b?.pending && a?.failed === b?.failed
    && a?.blockNumber === b?.blockNumber && a?.confirmations === b?.confirmations;
}
