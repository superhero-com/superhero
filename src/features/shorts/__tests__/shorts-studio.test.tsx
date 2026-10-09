import {
  fireEvent, render, screen, within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  describe, expect, it, vi,
} from 'vitest';
import { ShortsStudio } from '../shorts-studio';
import type { Performance, Short } from '../types';

vi.mock('@/components/layout/app-header/HeaderWalletButton', () => ({ default: () => <button type="button">Shared wallet</button> }));
const summary = {
  views: 4, reach: 2, watchSeconds: 12, watchHours: 12 / 3600, averageSeconds: 3, completion: 0, retention: [],
};
const performance: Performance = {
  days: 28,
  start: 1,
  end: 100000,
  since: 1,
  timezone: 'UTC',
  retentionDays: 90,
  partial: false,
  previousPartial: false,
  generatedAt: 100,
  summary,
  previous: summary,
  series: [],
  sources: [],
  videos: {},
  previousFinance: { earned: '0', paidLikes: 0 },
  finance: {
    syncedAt: 100,
    stale: false,
    message: '',
    confirmationsRequired: 3,
    earned: '0.08',
    paidLikes: 1,
    pending: 0,
    entries: [
      {
        id: 'reward', action: 'PaidLike', tx: 'th_reward', at: 20, amountAe: '0.08', amount: '80000000000000000', actor: 'viewer', beneficiary: 'creator', confirmed: true, confirmations: 3, height: 1,
      },
      {
        id: 'claim', action: 'Claimed', tx: 'th_claim', at: 30, amountAe: '0.04', amount: '40000000000000000', actor: 'creator', beneficiary: 'creator', confirmed: true, confirmations: 3, height: 1,
      },
    ],
  },
};
const short = (n: number, publication: Short['publicationStatus'] = 'published'): Short => ({
  id: String(n),
  title: `Short ${n}`,
  topic: 'Art',
  creator: 'creator',
  status: publication === 'published' ? 'active' : 'ready',
  publicationStatus: publication,
  cid: '',
  bytes: 100,
  duration: 12,
  likes: n,
  views: 0,
  liked: false,
  mine: true,
  moderation: 'approved',
  createdAt: n,
  guidelines: { status: 'eligible' },
});
type State = Parameters<typeof ShortsStudio>[0]['s'];
const state = (section: string, extra: Partial<State> = {}): State => ({
  section,
  days: 28,
  authenticated: true,
  busy: false,
  dashboard: {
    shorts: [short(1), short(2, 'draft')],
    account: {
      address: 'creator', wallet: '1', earned: '0.08', claimed: '0.04', available: '0.04', previousAvailable: '0',
    },
    totalLikes: 3,
    totalViews: 4,
    receipts: [],
  },
  performance,
  refreshNow: vi.fn(),
  refreshPerformance: vi.fn(),
  setDays: vi.fn(),
  setClaimReview: vi.fn(),
  claimPrevious: vi.fn(),
  clearMessage: vi.fn(),
  ...extra,
} as unknown as State);
const studio = (s: State, query = '') => render(<MemoryRouter initialEntries={[`/shorts/studio/${s.section === 'overview' ? '' : s.section}${query}`]}><ShortsStudio s={s} /></MemoryRouter>);

describe('Creator Studio workflows', () => {
  it('keeps overview concise with real next actions and a separate analytics destination', () => {
    studio(state('overview'));
    expect(screen.getByRole('heading', { name: 'Latest Shorts' })).toBeVisible();
    expect(screen.getByRole('link', { name: /1 draft to revisit/ })).toHaveAttribute('href', '/shorts/studio/content?status=draft');
    expect(screen.getByRole('link', { name: /Explore audience analytics/ })).toHaveAttribute('href', '/shorts/studio/analytics');
    expect(screen.queryByText('AUDIENCE RETENTION')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Review claim' })).not.toBeInTheDocument();
  });
  it('filters by publication status even when a private draft is eligible for the feed', () => {
    studio(state('content'));
    fireEvent.click(screen.getByRole('button', { name: 'Drafts 1' }));
    const library = screen.getByRole('region', { name: 'Content library' });
    expect(within(library).getByText('Short 2')).toBeVisible();
    expect(within(library).queryByText('Short 1')).not.toBeInTheDocument();
    expect(within(library).getByText('Only you can see this')).toBeVisible();
    expect(within(library).queryByRole('link', { name: 'Watch Short 2' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Search your Shorts' }), { target: { value: 'unmatched' } });
    expect(screen.getByText('No matching Shorts')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByText('Short 1')).toBeVisible();
  });
  it('sorts and paginates the complete library beyond 50 Shorts', () => {
    const s = state('content');
    s.dashboard!.shorts = Array.from({ length: 55 }, (_, i) => short(i + 1));
    studio(s, '?page=6');
    expect(screen.getByText('51–55 of 55 Shorts')).toBeVisible();
    expect(screen.getByText('Short 1')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    fireEvent.change(screen.getByRole('combobox', { name: 'Sort by' }), { target: { value: 'oldest' } });
    expect(screen.getByText('1–10 of 55 Shorts')).toBeVisible();
    const rows = screen.getAllByRole('row');
    expect(within(rows[1]).getByText('Short 1')).toBeVisible();
    fireEvent.change(screen.getByRole('combobox', { name: 'Sort by' }), { target: { value: 'likes' } });
    expect(within(screen.getAllByRole('row')[1]).getByText('Short 55')).toBeVisible();
  });
  it('does not turn unavailable views into zeros and offers a retry', () => {
    const s = state('content', { performance: undefined, performanceError: 'Offline' });
    studio(s);
    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(screen.getByRole('option', { name: 'Most views' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry views' }));
    expect(s.refreshPerformance).toHaveBeenCalledOnce();
  });
  it('keeps period filters separate from available rewards and claims', () => {
    const s = state('revenue');
    studio(s);
    fireEvent.click(screen.getByRole('button', { name: 'Review claim' }));
    expect(s.setClaimReview).toHaveBeenCalledExactlyOnceWith(true);
    fireEvent.click(screen.getByRole('button', { name: 'Claims' }));
    expect(screen.queryByText('Creator reward')).not.toBeInTheDocument();
    expect(screen.getByText('Rewards claimed')).toBeVisible();
    fireEvent.change(screen.getByRole('combobox', { name: 'Activity period' }), { target: { value: '7' } });
    expect(s.setDays).toHaveBeenCalledExactlyOnceWith(7);
    expect(within(screen.getByRole('region', { name: 'Available rewards' })).getByRole('heading')).toHaveTextContent('0.04 AE');
  });
  it('explains empty current rewards while keeping earlier rewards claimable', () => {
    const s = state('revenue');
    s.dashboard!.account.available = '0'; s.dashboard!.account.previousAvailable = '0.12';
    studio(s);
    expect(screen.getByRole('button', { name: 'No rewards to claim' })).toBeDisabled();
    expect(screen.getByText(/0.12 AE in earlier rewards/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Claim earlier rewards' }));
    expect(s.claimPrevious).toHaveBeenCalledOnce();
  });
  it('hides stale period totals, labels pending entries, and retries without hiding live balances', () => {
    const s = state('revenue', { performance: { ...performance, finance: { ...performance.finance, stale: true, entries: [{ ...performance.finance.entries[0], confirmed: false }] } } });
    studio(s);
    expect(screen.getByText('Updating…')).toBeVisible();
    expect(screen.getByText('Pending confirmation')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Review claim' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry activity' }));
    expect(s.refreshPerformance).toHaveBeenCalledOnce();
  });
  it('replaces failed dashboard loading with recovery and prevents claims using stale account data', () => {
    const s = state('revenue', { dashboardError: 'Unable to load account', dashboard: undefined });
    const { unmount } = studio(s);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(s.refreshNow).toHaveBeenCalledOnce();
    unmount();
    studio(state('revenue', { dashboardError: 'Account is stale' }));
    expect(screen.getByRole('button', { name: 'Review claim' })).toBeDisabled();
  });
  it('uses the one shared wallet control for guests', () => {
    studio(state('overview', { authenticated: false, actor: '' }));
    expect(screen.getAllByRole('button', { name: /wallet/i })).toHaveLength(1);
    expect(screen.queryByText('0.04 AE')).not.toBeInTheDocument();
  });
  it('switches analytics sections and selects the metric drawn in the chart', () => {
    studio(state('analytics', { performance: { ...performance, series: [{ ...summary, at: 1 }] } }));
    expect(screen.getByRole('img', { name: /Daily views/ })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /Watch time/ }));
    expect(screen.getByRole('img', { name: /Daily watch time/ })).toBeVisible();
    const navigation = screen.getByRole('navigation', { name: 'Analytics sections' });
    fireEvent.click(within(navigation).getByRole('link', { name: 'Reach' }));
    expect(within(navigation).getByRole('link', { name: 'Reach' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: /Browser reach/ })).toBeVisible();
    expect(screen.queryByRole('button', { name: /Creator earnings/ })).not.toBeInTheDocument();
    fireEvent.click(within(navigation).getByRole('link', { name: 'Engagement' }));
    fireEvent.click(screen.getByRole('button', { name: /Average view duration/ }));
    expect(screen.getByRole('img', { name: /Daily average view duration/ })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Audience retention' })).toBeVisible();
  });
  it('keeps missing measurement and syncing earnings out of the chart', () => {
    studio(state('analytics', {
      performance: {
        ...performance,
        since: 200000000,
        series: [{ ...summary, at: 1 }],
        finance: { ...performance.finance, stale: true },
        sources: [{ source: 'search', views: 99, suppressed: true }],
      },
    }));
    expect(screen.queryByRole('img', { name: /Daily views/ })).not.toBeInTheDocument();
    expect(screen.getByText('Not enough data')).toBeVisible();
    expect(screen.queryByText('99')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Creator earnings/ }));
    expect(screen.getByText('Reward history is updating.')).toBeVisible();
    expect(screen.queryByRole('img', { name: /Daily creator earnings/ })).not.toBeInTheDocument();
  });
  it('displays watch hours consistently in the metric and daily chart without changing average duration units', () => {
    const measured = {
      ...summary, views: 270, watchSeconds: 5400, watchHours: 1.5, averageSeconds: 20,
    };
    studio(state('analytics', {
      performance: { ...performance, summary: measured, series: [{ ...measured, at: 1 }] },
    }), '?analytics=engagement');
    expect(within(screen.getByRole('button', { name: /Watch time/ })).getByText('1.5 h')).toBeVisible();
    expect(within(screen.getByRole('button', { name: /Average view duration/ })).getByText('20s')).toBeVisible();
    fireEvent.click(screen.getByText('View daily data'));
    expect(within(screen.getByRole('table')).getByText('1.5 h')).toBeVisible();
    expect(screen.getByText(/Watch hours equal watch seconds divided by 3,600/)).toBeVisible();
  });
  it('opens a Short directly in analytics and keeps management actions in Details', () => {
    studio(state('video', { videoId: '1' }), '?panel=analytics&analytics=reach');
    expect(screen.getByRole('heading', { name: 'Short 1' })).toBeVisible();
    expect(screen.getByRole('button', { name: /Browser reach/ })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Withdraw' })).not.toBeInTheDocument();
    const navigation = screen.getByRole('navigation', { name: 'Short sections' });
    fireEvent.click(within(navigation).getByRole('link', { name: 'Details' }));
    expect(screen.getByRole('button', { name: 'Load private preview' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Withdraw' })).toBeVisible();
    fireEvent.click(within(navigation).getByRole('link', { name: 'Revenue' }));
    expect(screen.getByRole('heading', { name: 'Reward activity' })).toBeVisible();
    expect(screen.queryByRole('navigation', { name: 'Analytics sections' })).not.toBeInTheDocument();
  });
  it('sorts from table headings in both directions and links directly to analytics', () => {
    studio(state('content'));
    expect(screen.getByRole('link', { name: 'Analytics for Short 1' })).toHaveAttribute('href', '/shorts/studio/video/1?panel=analytics');
    fireEvent.click(screen.getByRole('button', { name: 'Date' }));
    expect(within(screen.getAllByRole('row')[1]).getByText('Short 1')).toBeVisible();
    expect(screen.getByRole('columnheader', { name: 'Date' })).toHaveAttribute('aria-sort', 'ascending');
    fireEvent.click(screen.getByRole('button', { name: 'Paid Likes' }));
    expect(within(screen.getAllByRole('row')[1]).getByText('Short 2')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Paid Likes' }));
    expect(within(screen.getAllByRole('row')[1]).getByText('Short 1')).toBeVisible();
  });
});
