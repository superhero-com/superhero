import type { Performance } from './types';

export function dailyCreatorRevenue(p: Performance) {
  return p.series.map(({ at }) => {
    const likes = p.finance.entries.filter((e) => (
      e.confirmed && e.action === 'PaidLike' && e.at >= at && e.at < at + 86400000
    ));
    const total = likes.reduce((sum, e) => sum + BigInt(e.amount), 0n);
    const fraction = (total % (10n ** 18n)).toString().padStart(18, '0').replace(/0+$/, '');
    const earnedAe = `${total / (10n ** 18n)}${fraction ? `.${fraction}` : ''}`;
    return { at, earnedAe, paidLikes: likes.length };
  });
}
