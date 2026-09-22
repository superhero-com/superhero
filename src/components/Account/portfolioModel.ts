export type PortfolioCurrency = 'ae' | 'usd';
export type PortfolioRange = '1d' | '1w' | '1m' | 'all';

export interface PortfolioSnapshot {
  timestamp: string;
  total_value_ae?: number | null;
  total_value_usd?: number | null;
  ae_balance?: number | null;
  tokens_value_ae?: number | null;
  total_pnl?: { gain?: { ae?: number | null; usd?: number | null } };
}

export const PORTFOLIO_RANGES = {
  '1d': { days: 1, interval: 3600 },
  '1w': { days: 7, interval: 21600 },
  '1m': { days: 30, interval: 86400 },
  all: { days: Infinity, interval: 86400 },
};

export const finiteAmount = (value: unknown): number | null => (
  typeof value === 'number' && Number.isFinite(value) ? value : null
);

export const portfolioValue = (
  snapshot: PortfolioSnapshot | null | undefined,
  currency: PortfolioCurrency,
) => finiteAmount(currency === 'ae' ? snapshot?.total_value_ae : snapshot?.total_value_usd);

export const portfolioPeriod = (range: PortfolioRange, now: number) => {
  const start = Math.max(Date.UTC(2025, 0, 1), now - PORTFOLIO_RANGES[range].days * 86400000);
  return {
    startDate: new Date(start).toISOString(),
    endDate: new Date(now).toISOString(),
    interval: PORTFOLIO_RANGES[range].interval,
  };
};

export const portfolioPoints = (
  history: PortfolioSnapshot[],
  latest: PortfolioSnapshot | null | undefined,
  currency: PortfolioCurrency,
  now: number,
) => {
  const points = new Map<number, { time: number; value: number }>();
  history.forEach((snapshot) => {
    const time = Date.parse(snapshot.timestamp);
    const value = portfolioValue(snapshot, currency);
    if (Number.isFinite(time) && time <= now && value !== null) points.set(time, { time, value });
  });
  // A current snapshot may extend a historical series; it cannot invent one.
  if (points.size && latest) {
    const time = Date.parse(latest.timestamp);
    const value = portfolioValue(latest, currency);
    if (time >= Math.max(...points.keys()) && time <= now && value !== null) {
      points.set(time, { time, value });
    }
  }
  return [...points.values()].sort((a, b) => a.time - b.time);
};

export const portfolioChange = (points: { value: number }[]) => {
  if (points.length < 2) return null;
  const first = points[0].value;
  const amount = points[points.length - 1].value - first;
  return { amount, percentage: first > 0 ? (amount / first) * 100 : null };
};
