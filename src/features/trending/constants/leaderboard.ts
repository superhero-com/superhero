import type {
  LeaderboardMetric,
  LeaderboardTimeframe,
} from '../api/leaderboard';

export const LEADERBOARD_TIMEFRAME_OPTIONS: {
  label: string;
  value: LeaderboardTimeframe;
}[] = [
  { label: '30M', value: '30m' },
  { label: '1H', value: '1h' },
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: 'All', value: 'all' },
];

export const LEADERBOARD_METRIC_OPTIONS: {
  label: string;
  value: LeaderboardMetric;
}[] = [
  { label: 'PnL', value: 'pnl' },
  { label: 'ROI', value: 'roi' },
  { label: 'AUM', value: 'aum' },
  { label: 'MDD', value: 'mdd' },
];
