import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act, fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import TokenPriceAlerts from '../TokenPriceAlerts';

let mockAccount: string | undefined = 'ak_alice';
const mockSign = vi.fn(async () => 'sig');
const mockApi = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@/features/notifications/useNotifications', () => ({
  apiBaseUrl: () => 'http://api.test',
  useNotificationSigner: () => ({ activeAccount: mockAccount, signNotificationMessage: mockSign }),
}));
vi.mock('@/features/notifications/priceAlerts', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/features/notifications/priceAlerts')>(),
  // A real class: `new` ignores an object returned by a mock implementation.
  PriceAlertsApi: class {
    constructor() {
      Object.assign(this, mockApi);
    }
  },
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => (opts?.target ? `${key}:${opts.target}` : key),
  }),
}));

const SALE = 'ct_sale';
const ALERTS_KEY = ['price-alerts', 'ak_alice'];

function mount(ui: ReactElement, client = new QueryClient()) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, ...render(ui, { wrapper }) };
}

const submit = () => fireEvent.click(screen.getByRole('button', { name: 'priceAlerts.set' }));
const typeTarget = (value: string) => fireEvent.change(
  screen.getByLabelText('priceAlerts.target'),
  { target: { value } },
);

describe('TokenPriceAlerts', () => {
  beforeEach(() => {
    mockAccount = 'ak_alice';
    mockSign.mockClear();
    mockApi.list.mockReset().mockResolvedValue([]);
    mockApi.create.mockReset().mockImplementation(async (_account, sale, direction, target) => ({
      id: 1, sale_address: sale, direction, target_ae: target, triggered_at: null,
    }));
    mockApi.remove.mockReset().mockResolvedValue(undefined);
  });

  it('renders nothing and fetches nothing without a connected account', () => {
    mockAccount = undefined;
    const { container } = mount(<TokenPriceAlerts saleAddress={SALE} />);
    expect(container.firstChild).toBeNull();
    expect(mockApi.list).not.toHaveBeenCalled();
  });

  it('suggests the direction from the current price and creates the alert', async () => {
    mockApi.list.mockResolvedValue([
      {
        id: 4, sale_address: SALE, direction: 'above', target_ae: '1', triggered_at: null,
      },
    ]);
    mount(<TokenPriceAlerts saleAddress={SALE} symbol="WORD" priceAe="0.5" />);
    expect(await screen.findByText('priceAlerts.whenAbove:1')).toBeInTheDocument();
    typeTarget('0.25');
    expect((screen.getByLabelText('priceAlerts.direction') as HTMLSelectElement).value).toBe('below');
    submit();
    await waitFor(() => expect(mockApi.create).toHaveBeenCalledWith('ak_alice', SALE, 'below', '0.25', mockSign));
    expect(await screen.findByRole('status')).toHaveTextContent('priceAlerts.saved');
    expect(screen.getByText('priceAlerts.whenBelow:0.25')).toBeInTheDocument();
    expect(screen.getByText('priceAlerts.whenAbove:1')).toBeInTheDocument();
    expect(mockApi.list).toHaveBeenCalledTimes(1);
  });

  it('does not list a new alert twice when a read already returned it', async () => {
    mockApi.list.mockResolvedValue([
      {
        id: 1, sale_address: SALE, direction: 'below', target_ae: '0.25', triggered_at: null,
      },
    ]);
    mount(<TokenPriceAlerts saleAddress={SALE} priceAe="0.5" />);
    expect(await screen.findByText('priceAlerts.whenBelow:0.25')).toBeInTheDocument();
    typeTarget('0.25');
    submit();
    expect(await screen.findByRole('status')).toHaveTextContent('priceAlerts.saved');
    expect(screen.getAllByText('priceAlerts.whenBelow:0.25')).toHaveLength(1);
  });

  it('keeps a new alert when an older read lands after it', async () => {
    const { client } = mount(<TokenPriceAlerts saleAddress={SALE} priceAe="0.5" />);
    await waitFor(() => expect(client.getQueryState(ALERTS_KEY)?.status).toBe('success'));
    let resolveStale: (list: unknown[]) => void = () => {};
    mockApi.list.mockImplementation(() => new Promise((resolve) => { resolveStale = resolve; }));
    act(() => { client.invalidateQueries({ queryKey: ALERTS_KEY }); });
    await waitFor(() => expect(mockApi.list).toHaveBeenCalledTimes(2));
    typeTarget('0.25');
    submit();
    expect(await screen.findByText('priceAlerts.whenBelow:0.25')).toBeInTheDocument();
    await act(async () => {
      resolveStale([]);
      // Query results reach the cache and the component on a later macrotask.
      await new Promise((resolve) => { setTimeout(resolve, 0); });
    });
    expect(client.getQueryData(ALERTS_KEY)).toEqual([expect.objectContaining({ id: 1 })]);
    expect(screen.getByText('priceAlerts.whenBelow:0.25')).toBeInTheDocument();
  });

  it('formats the current price as a typeable placeholder', () => {
    mount(<TokenPriceAlerts saleAddress={SALE} priceAe="1e-7" />);
    expect(screen.getByLabelText('priceAlerts.target')).toHaveAttribute('placeholder', '0.0000001');
  });

  it('explains an invalid price when the user submits it', async () => {
    mount(<TokenPriceAlerts saleAddress={SALE} />);
    const button = screen.getByRole('button', { name: 'priceAlerts.set' });
    expect(button).toBeDisabled();
    typeTarget('0');
    expect(button).toBeEnabled();
    expect(screen.queryByRole('alert')).toBeNull();
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('priceAlerts.invalidTarget');
    expect(mockApi.create).not.toHaveBeenCalled();
  });

  it('lists only this token’s active alerts and removes one', async () => {
    mockApi.list.mockResolvedValue([
      {
        id: 4, sale_address: SALE, direction: 'above', target_ae: '1', triggered_at: null,
      },
      {
        id: 5, sale_address: 'ct_other', direction: 'above', target_ae: '2', triggered_at: null,
      },
      {
        id: 6, sale_address: SALE, direction: 'below', target_ae: '0.1', triggered_at: '2026-10-24',
      },
    ]);
    mount(<TokenPriceAlerts saleAddress={SALE} />);
    expect(await screen.findByText('priceAlerts.whenAbove:1')).toBeInTheDocument();
    expect(screen.queryByText('priceAlerts.whenAbove:2')).toBeNull();
    expect(screen.getByText('priceAlerts.firedCount')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'priceAlerts.remove' }));
    await waitFor(() => expect(mockApi.remove).toHaveBeenCalledWith('ak_alice', 4, mockSign));
    await waitFor(() => expect(screen.queryByText('priceAlerts.whenAbove:1')).toBeNull());
  });

  it('shares one list request across token pages', async () => {
    mockApi.list.mockResolvedValue([
      {
        id: 5, sale_address: 'ct_other', direction: 'above', target_ae: '2', triggered_at: null,
      },
    ]);
    const { client, rerender } = mount(<TokenPriceAlerts key={SALE} saleAddress={SALE} />);
    await waitFor(() => expect(client.getQueryState(ALERTS_KEY)?.status).toBe('success'));
    rerender(<TokenPriceAlerts key="ct_other" saleAddress="ct_other" />);
    expect(await screen.findByText('priceAlerts.whenAbove:2')).toBeInTheDocument();
    expect(mockApi.list).toHaveBeenCalledTimes(1);
  });

  it('ignores a previous account’s list that arrives late', async () => {
    let resolveAlice: (list: unknown[]) => void = () => {};
    mockApi.list.mockImplementation((account: string) => (account === 'ak_alice'
      ? new Promise((resolve) => { resolveAlice = resolve; })
      : Promise.resolve([])));
    const { client, rerender } = mount(<TokenPriceAlerts saleAddress={SALE} />);
    mockAccount = 'ak_bob';
    rerender(<TokenPriceAlerts saleAddress={SALE} />);
    await waitFor(() => expect(mockApi.list).toHaveBeenCalledWith('ak_bob'));
    resolveAlice([
      {
        id: 4, sale_address: SALE, direction: 'above', target_ae: '1', triggered_at: null,
      },
    ]);
    await waitFor(() => expect(client.getQueryState(ALERTS_KEY)?.status).toBe('success'));
    expect(screen.queryByText('priceAlerts.whenAbove:1')).toBeNull();
  });

  it('shows the backend error', async () => {
    mockApi.create.mockRejectedValue(new Error('Price is already above the target'));
    mount(<TokenPriceAlerts saleAddress={SALE} priceAe="1" />);
    typeTarget('0.5');
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Price is already above the target');
  });

  it('falls back to the localized error when the request gives no reason', async () => {
    mockApi.create.mockRejectedValue(new Error(''));
    mount(<TokenPriceAlerts saleAddress={SALE} priceAe="1" />);
    typeTarget('0.5');
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('priceAlerts.failed');
  });
});
