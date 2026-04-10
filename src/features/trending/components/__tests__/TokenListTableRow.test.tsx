import {
  fireEvent,
  render,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import TokenListTableRow from '../TokenListTableRow';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router-dom')>();
  return { ...mod, useNavigate: () => mockNavigate };
});

vi.mock('@/features/shared/components', () => ({
  PriceDataFormatter: () => <span data-testid="price-data-formatter">price</span>,
}));

vi.mock('../TokenLineChart', () => ({
  TokenLineChart: () => <div data-testid="token-line-chart" />,
}));

const TOKEN = {
  address: 'ct_test',
  sale_address: 'ct_sale',
  name: 'Alpha Token',
  symbol: 'ALPHA',
  total_supply: '1000000000000000000',
  price_data: { usd: 1 },
  market_cap_data: { usd: 10 },
  performance: {},
} as any;

const EXPECTED_HREF = '/trending/tokens/Alpha%20Token';

function renderRow() {
  return render(
    <MemoryRouter>
      <table>
        <tbody>
          <TokenListTableRow token={TOKEN} rank={1} />
        </tbody>
      </table>
    </MemoryRouter>,
  );
}

describe('TokenListTableRow', () => {
  it('renders accessible clickable rows', () => {
    const { container } = renderRow();

    const rows = container.querySelectorAll('tr[role="link"]');
    expect(rows).toHaveLength(2);
    rows.forEach((row) => {
      expect(row).toHaveAttribute(
        'aria-label',
        'View Alpha Token',
      );
      expect(row).toHaveAttribute('tabindex', '0');
    });
  });

  it('uses SPA navigation on plain click', () => {
    const { container } = renderRow();

    const desktopRow = container.querySelector(
      'tr.bctsl-token-list-table-row',
    )!;
    fireEvent.click(desktopRow);
    expect(mockNavigate).toHaveBeenCalledWith(EXPECTED_HREF);
  });

  it('opens new tab on Ctrl+click', () => {
    const spy = vi.spyOn(window, 'open')
      .mockImplementation(() => null);

    const { container } = renderRow();
    const desktopRow = container.querySelector(
      'tr.bctsl-token-list-table-row',
    )!;

    fireEvent.click(desktopRow, { ctrlKey: true });
    expect(spy).toHaveBeenCalledWith(
      EXPECTED_HREF,
      '_blank',
      'noopener',
    );
    spy.mockRestore();
  });

  it('opens new tab on Meta+click (Cmd)', () => {
    const spy = vi.spyOn(window, 'open')
      .mockImplementation(() => null);

    const { container } = renderRow();
    const desktopRow = container.querySelector(
      'tr.bctsl-token-list-table-row',
    )!;

    fireEvent.click(desktopRow, { metaKey: true });
    expect(spy).toHaveBeenCalledWith(
      EXPECTED_HREF,
      '_blank',
      'noopener',
    );
    spy.mockRestore();
  });

  it('opens new tab on middle-click', () => {
    const spy = vi.spyOn(window, 'open')
      .mockImplementation(() => null);

    const { container } = renderRow();
    const desktopRow = container.querySelector(
      'tr.bctsl-token-list-table-row',
    )!;

    fireEvent(
      desktopRow,
      new MouseEvent('auxclick', { button: 1, bubbles: true }),
    );
    expect(spy).toHaveBeenCalledWith(
      EXPECTED_HREF,
      '_blank',
      'noopener',
    );
    spy.mockRestore();
  });
});
