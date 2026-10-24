import {
  fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import TokenPriceAlerts from '../TokenPriceAlerts';

let mockAccount: string | undefined = 'ak_alice';
const mockSign = vi.fn(async () => 'sig');

vi.mock('@/features/notifications/useNotifications', () => ({
  apiBaseUrl: () => 'http://api.test',
  useNotificationSigner: () => ({ activeAccount: mockAccount, signNotificationMessage: mockSign }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => (opts?.target ? `${key}:${opts.target}` : key),
  }),
}));

const SALE = 'ct_sale';

function fakeApi(list: any[] = []) {
  return {
    list: vi.fn(async () => list),
    create: vi.fn(async () => ({ id: 1 })),
    remove: vi.fn(async () => undefined),
  } as any;
}

describe('TokenPriceAlerts', () => {
  beforeEach(() => {
    mockAccount = 'ak_alice';
    mockSign.mockClear();
  });

  it('renders nothing without a connected account', () => {
    mockAccount = undefined;
    const { container } = render(<TokenPriceAlerts saleAddress={SALE} api={fakeApi()} />);
    expect(container.firstChild).toBeNull();
  });

  it('suggests the direction from the current price and creates the alert', async () => {
    const api = fakeApi();
    render(<TokenPriceAlerts saleAddress={SALE} symbol="WORD" priceAe="0.5" api={api} />);
    const input = screen.getByLabelText('priceAlerts.target');
    fireEvent.change(input, { target: { value: '0.25' } });
    expect((screen.getByLabelText('priceAlerts.direction') as HTMLSelectElement).value).toBe('below');
    fireEvent.click(screen.getByRole('button', { name: 'priceAlerts.set' }));
    await waitFor(() => expect(api.create).toHaveBeenCalledWith('ak_alice', SALE, 'below', '0.25', mockSign));
    expect(await screen.findByRole('status')).toHaveTextContent('priceAlerts.saved');
  });

  it('keeps the submit disabled for an invalid price', () => {
    render(<TokenPriceAlerts saleAddress={SALE} api={fakeApi()} />);
    fireEvent.change(screen.getByLabelText('priceAlerts.target'), { target: { value: '0' } });
    expect(screen.getByRole('button', { name: 'priceAlerts.set' })).toBeDisabled();
  });

  it('lists only this token’s active alerts and removes one', async () => {
    const api = fakeApi([
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
    render(<TokenPriceAlerts saleAddress={SALE} api={api} />);
    expect(await screen.findByText('priceAlerts.whenAbove:1')).toBeInTheDocument();
    expect(screen.queryByText('priceAlerts.whenAbove:2')).toBeNull();
    expect(screen.getByText('priceAlerts.firedCount')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'priceAlerts.remove' }));
    await waitFor(() => expect(api.remove).toHaveBeenCalledWith('ak_alice', 4, mockSign));
    await waitFor(() => expect(screen.queryByText('priceAlerts.whenAbove:1')).toBeNull());
  });

  it('shows the backend error', async () => {
    const api = fakeApi();
    api.create.mockRejectedValue(new Error('Price is already above the target'));
    render(<TokenPriceAlerts saleAddress={SALE} priceAe="1" api={api} />);
    fireEvent.change(screen.getByLabelText('priceAlerts.target'), { target: { value: '0.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'priceAlerts.set' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Price is already above the target');
  });
});
