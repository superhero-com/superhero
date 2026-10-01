import {
  fireEvent, render, screen, waitFor, within,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider, createStore } from 'jotai';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { recentActivitiesAtom } from '@/atoms/dexAtoms';
import type { RecentActivity as Activity, TransactionStatus } from '../../types/dex';
import RecentActivity from '../RecentActivity';
import { activityAmount, activityStatus } from '../recentActivityData';

const mocks = vi.hoisted(() => ({
  account: 'ak_alice' as string | undefined,
  metadata: vi.fn(),
  copy: vi.fn(),
  statuses: {} as Record<string, TransactionStatus>,
  polling: vi.fn(),
}));
vi.mock('@/hooks/useAccount', () => ({ useAccount: () => ({ activeAccount: mocks.account }) }));
vi.mock('@/hooks/useTransactionStatus', () => ({
  useTransactionStatus: (hash: string, options: { enabled: boolean }) => {
    mocks.polling(hash, options.enabled);
    return { status: options.enabled ? mocks.statuses[hash] : null };
  },
}));
vi.mock('@/api/generated', () => ({
  DexService: {
    getDexTokenByAddress: (args: unknown) => {
      const request = mocks.metadata(args);
      return Object.assign(request, { cancel: vi.fn() });
    },
  },
}));
vi.mock('@/utils/address', () => ({ copyToClipboard: mocks.copy }));
const item = (overrides: Partial<Activity> = {}): Activity => ({
  account: 'ak_alice',
  type: 'swap',
  hash: 'th_first',
  timestamp: Date.now(),
  tokenIn: 'AE',
  tokenOut: 'WTT',
  amountIn: '25',
  amountOut: '5055.95',
  ...overrides,
});
let client: QueryClient;
let store: ReturnType<typeof createStore>;
const readActivities = () => store.get(recentActivitiesAtom) as Record<string, Activity[]>;
const content = () => (
  <QueryClientProvider client={client}>
    <Provider store={store}><RecentActivity /></Provider>
  </QueryClientProvider>
);
beforeEach(() => {
  vi.clearAllMocks(); mocks.account = 'ak_alice'; mocks.statuses = {};
  mocks.metadata.mockResolvedValue({ symbol: 'TEST' }); mocks.copy.mockResolvedValue(true);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  store = createStore();
  store.set(recentActivitiesAtom, {});
});
afterEach(() => client.clear());

describe('recent activity', () => {
  it('shows three rows first, expands all, and preserves liquidity amount semantics', async () => {
    store.set(recentActivitiesAtom, {
      ak_alice: [
        item(), item({ hash: 'th_second', type: 'wrap' }),
        item({ hash: 'th_third', type: 'add_liquidity' }),
        item({
          hash: 'th_fourth', type: 'remove_liquidity', amountIn: '0.02', amountOut: undefined,
        }),
      ],
    });
    render(content());
    expect(screen.getAllByRole('article')).toHaveLength(3);
    expect(mocks.metadata).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /View all 4 activities/ }));
    expect(screen.getAllByRole('article')).toHaveLength(4);
    const removal = screen.getByRole('button', { name: /Remove liquidity/ });
    expect(removal).toHaveTextContent('0.02 LP tokens');
    expect(removal).not.toHaveTextContent('0.02 AE');
    const deposit = screen.getByRole('button', { name: /Add liquidity/ });
    expect(deposit).toHaveTextContent('+');
    fireEvent.click(screen.getByRole('button', { name: /Swap/ }));
    expect(screen.getByText('Amounts are saved quotes. Final amounts may differ.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Copy transaction ID' }));
    await screen.findByText('Transaction ID copied.');
    expect(mocks.copy).toHaveBeenCalledWith('th_first');
    expect(screen.getByRole('link', { name: 'View transaction' }).getAttribute('href')).toContain('/transactions/th_first');
  });
  it('does not invent pending status, poll unsupported hashes, or overwrite a terminal status', () => {
    store.set(recentActivitiesAtom, {
      ak_alice: [
        item({ hash: undefined }), item({ hash: '0x1234', type: 'bridge' }),
        item({ hash: 'th_done', status: { confirmed: true } }),
      ],
    });
    render(content());
    expect(screen.getAllByText('Unknown')).toHaveLength(2);
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(mocks.polling.mock.calls.every(([, enabled]) => !enabled)).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /Bridge/ }));
    expect(screen.queryByRole('link', { name: 'View transaction' })).not.toBeInTheDocument();
  });
  it('saves a fetched status to its owner and resets details when the wallet switches', async () => {
    store.set(recentActivitiesAtom, {
      ak_alice: [item()], ak_bob: [item({ account: 'ak_bob', hash: 'th_bob', type: 'wrap' })],
    });
    mocks.statuses.th_first = { confirmed: true, blockNumber: 120, confirmations: 1 };
    const view = render(content());
    await waitFor(() => {
      expect(readActivities().ak_alice[0].status?.confirmed).toBe(true);
    });
    fireEvent.click(screen.getByRole('button', { name: /Swap/ }));
    expect(screen.getByText('1 confirmation')).toBeInTheDocument();
    mocks.account = 'ak_bob'; view.rerender(content());
    expect(screen.queryByText('th_first')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Swap/ })).not.toBeInTheDocument();
    expect(readActivities().ak_bob[0].status).toBeUndefined();
    mocks.account = undefined; view.rerender(content());
    expect(screen.getByText('Connect to see your activity')).toBeInTheDocument();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });
  it('requires confirmation and clears only the current account’s saved history', async () => {
    store.set(recentActivitiesAtom, { ak_alice: [item()], ak_bob: [item({ account: 'ak_bob' })] });
    render(content());
    fireEvent.keyDown(screen.getByRole('button', { name: 'Activity options' }), { key: 'Enter' });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Clear local history' }));
    expect(readActivities().ak_alice).toHaveLength(1);
    const confirmation = screen.getByRole('region', { name: 'Clear local history' });
    await waitFor(() => expect(within(confirmation).getByRole('button', { name: 'Cancel' })).toHaveFocus());
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Clear history' }));
    expect(screen.getByText('No recent activity yet')).toBeInTheDocument();
    expect(readActivities().ak_alice).toBeUndefined();
    expect(readActivities().ak_bob).toHaveLength(1);
  });
  it('dismisses a pending clear confirmation on account change', async () => {
    store.set(recentActivitiesAtom, { ak_alice: [item()], ak_bob: [item({ account: 'ak_bob' })] });
    const view = render(content());
    fireEvent.keyDown(screen.getByRole('button', { name: 'Activity options' }), { key: 'Enter' });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Clear local history' }));
    mocks.account = 'ak_bob'; view.rerender(content());
    expect(screen.queryByRole('button', { name: 'Clear history' })).not.toBeInTheDocument();
    expect(readActivities().ak_alice).toHaveLength(1);
    expect(readActivities().ak_bob).toHaveLength(1);
  });
  it('resolves contract identifiers while leaving symbols as display text', async () => {
    store.set(recentActivitiesAtom, { ak_alice: [item({ tokenOut: 'ct_contract' })] });
    render(content());
    await screen.findByText('TEST');
    expect(mocks.metadata).toHaveBeenCalledTimes(1);
    expect(mocks.metadata).toHaveBeenCalledWith({ address: 'ct_contract' });
  });
  it('keeps tiny values visible, missing values unknown and failed status authoritative', () => {
    expect(activityAmount('0.000000000001', 'en')).toBe('0.000000000001');
    expect(activityAmount('0', 'en')).toBe('0');
    expect(activityAmount(undefined, 'en')).toBe('—');
    expect(activityAmount('12broken', 'en')).toBe('—');
    expect(activityStatus({ confirmed: true, failed: true })).toBe('failed');
  });
});
