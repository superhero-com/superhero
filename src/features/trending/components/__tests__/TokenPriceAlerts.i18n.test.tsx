import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import {
  afterEach, describe, expect, it, vi,
} from 'vitest';
import { changeLanguage } from '@/i18n';
import TokenPriceAlerts from '../TokenPriceAlerts';

const mockList = vi.hoisted(() => vi.fn());

vi.mock('@/features/notifications/useNotifications', () => ({
  apiBaseUrl: () => 'http://api.test',
  useNotificationSigner: () => ({ activeAccount: 'ak_alice', signNotificationMessage: vi.fn() }),
}));
vi.mock('@/features/notifications/NotificationsContext', () => ({
  useNotificationsContext: () => ({
    connected: true,
    connecting: false,
    error: null,
    connect: vi.fn(),
    sessionToken: () => 'tok',
    items: [],
  }),
}));
vi.mock('@/features/notifications/priceAlerts', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/features/notifications/priceAlerts')>(),
  PriceAlertsApi: class {
    list = mockList;
  },
}));

const SALE = 'ct_sale';

function renderWithFired(count: number) {
  mockList.mockResolvedValue(Array.from({ length: count }, (_, id) => ({
    id, sale_address: SALE, direction: 'above', target_ae: '1', triggered_at: '2026-10-24',
  })));
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TokenPriceAlerts saleAddress={SALE} />
    </QueryClientProvider>,
  );
}

afterEach(() => changeLanguage('en'));

describe('TokenPriceAlerts translations', () => {
  it('reads its copy from the trending namespace', () => {
    renderWithFired(0);
    expect(screen.getByRole('heading', { name: 'Price alert' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Set alert' })).toBeInTheDocument();
  });

  it.each([
    ['en', 1, '1 alert already sent'],
    ['en', 2, '2 alerts already sent'],
    ['ru', 1, '1 оповещение уже отправлено'],
    ['ru', 3, '3 оповещения уже отправлены'],
    ['ru', 5, '5 оповещений уже отправлено'],
    ['ar', 2, 'تم إرسال تنبيهين'],
    ['zh', 2, '已发送 2 条提醒'],
  ] as const)('uses the %s plural form for %i sent alerts', async (language, count, expected) => {
    await changeLanguage(language);
    renderWithFired(count);
    expect(await screen.findByText(expected)).toBeInTheDocument();
  });
});
