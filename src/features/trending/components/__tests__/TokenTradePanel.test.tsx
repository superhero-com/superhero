import { useState } from 'react';
import {
  fireEvent, render, screen,
} from '@testing-library/react';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import type { TokenDto } from '@/api/generated/models/TokenDto';
import { Decimal } from '@/libs/decimal';
import type { useTokenTrade } from '../../hooks/useTokenTrade';
import TokenTradePanel from '../TokenTradePanel';
import TokenTradeAmount from '../TokenTradeAmount';

vi.mock('@/hooks/useCurrencies', () => ({
  useCurrencies: () => ({
    currentCurrencyCode: 'eur',
    currentCurrencyInfo: { symbol: '€' },
    currentCurrencyRate: 0.01,
    getFiat: (amount: Decimal) => amount.mul(0.01),
  }),
}));
const token = { sale_address: 'ct_token', symbol: 'TEST', name: 'TEST' } as TokenDto;
const onConnect = vi.fn();
let trade: ReturnType<typeof useTokenTrade>;
beforeEach(() => {
  vi.clearAllMocks();
  trade = {
    tokenA: 10,
    tokenB: 100,
    isBuying: true,
    isAllowSelling: false,
    loadingTransaction: false,
    errorMessage: undefined,
    isInsufficientBalance: false,
    averageTokenPrice: Decimal.from(0.1),
    priceImpactDiff: Decimal.from(0.01),
    protocolTokenReward: 0.5,
    userBalance: '42',
    spendableAeBalance: Decimal.from('98.999'),
    estimatedNextTokenPriceImpactDifferenceFormattedPercentage: '0.12',
    slippage: 1,
    switchTradeView: vi.fn(),
    setTokenAmount: vi.fn(),
    setSlippage: vi.fn(),
    placeTokenTradeOrder: vi.fn(),
  } as unknown as ReturnType<typeof useTokenTrade>;
});
const panel = (connected = true) => (
  <TokenTradePanel token={token} trade={trade} connected={connected} onConnect={onConnect} />
);
describe('Token trade panel', () => {
  it('connects through the existing callback, and submits only a valid connected order', () => {
    const view = render(panel(false));
    fireEvent.click(screen.getByRole('button', { name: 'Connect wallet' }));
    expect(onConnect).toHaveBeenCalledOnce();
    expect(trade.placeTokenTradeOrder).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Max' })).not.toBeInTheDocument();
    view.rerender(panel());
    fireEvent.click(screen.getByRole('button', { name: 'Buy TEST' }));
    expect(trade.placeTokenTradeOrder).toHaveBeenCalledWith(token);
    trade = { ...trade, tokenB: undefined };
    view.rerender(panel());
    expect(screen.getByRole('button', { name: 'Enter an amount' })).toBeDisabled();
    trade = { ...trade, tokenB: 100, isInsufficientBalance: true };
    view.rerender(panel());
    expect(screen.getByRole('button', { name: 'Insufficient available balance' })).toBeDisabled();
  });
  it('passes edits to the correct quote side, uses reserved Max, and formats selected fiat', () => {
    render(panel());
    fireEvent.click(screen.getByRole('button', { name: 'Max' }));
    expect(trade.setTokenAmount).toHaveBeenLastCalledWith(98.999, true);
    fireEvent.change(screen.getByRole('textbox', { name: 'You receive Estimated' }), { target: { value: '200' } });
    expect(trade.setTokenAmount).toHaveBeenLastCalledWith(200, false);
    expect(screen.getByText(/€.*EUR/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Switch buy and sell' }));
    expect(trade.switchTradeView).toHaveBeenCalledWith(false);
  });
  it('saves valid slippage only on Save and leaves the preference alone on Cancel', () => {
    render(panel());
    const open = () => fireEvent.click(screen.getByRole('button', { name: 'Trade settings · 1%' }));
    open();
    const input = screen.getByRole('textbox', { name: 'Custom tolerance' });
    fireEvent.change(input, { target: { value: '51' } });
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    fireEvent.change(input, { target: { value: '0,5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(trade.setSlippage).not.toHaveBeenCalled();
    open();
    fireEvent.change(screen.getByRole('textbox', { name: 'Custom tolerance' }), { target: { value: '0,5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(trade.setSlippage).toHaveBeenCalledWith(0.5);
    expect(screen.getByRole('button', { name: 'Trade settings · 1%' })).toHaveFocus();
  });
  it('locks amounts and direction while signing and distinguishes the two sell steps', () => {
    trade = {
      ...trade, isBuying: false, isAllowSelling: true, loadingTransaction: true,
    };
    const view = render(panel());
    expect(screen.getByRole('textbox', { name: 'You pay' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Buy' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Confirm in your wallet.*1\/2/ })).toBeDisabled();
    trade = { ...trade, isAllowSelling: false };
    view.rerender(panel());
    expect(screen.getByRole('button', { name: /Confirm in your wallet.*2\/2/ })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Trade details' }));
    expect(screen.queryByText('Protocol token reward')).not.toBeInTheDocument();
  });
  it('keeps editable decimal buffers and clears them when reset externally', () => {
    const Amount = ({ reset = false }: { reset?: boolean }) => {
      const [value, setValue] = useState<number | undefined>(undefined);
      return <TokenTradeAmount value={reset ? undefined : value} onChange={setValue} onFocus={() => {}} symbol="TEST" ae pay balance="1" connected disabled={false} />;
    };
    const view = render(<Amount />);
    const input = screen.getByRole('textbox', { name: 'You pay' });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '0.' } });
    expect(input).toHaveValue('0.');
    fireEvent.change(input, { target: { value: '0,50' } });
    expect(input).toHaveValue('0.50');
    fireEvent.change(input, { target: { value: '1.2.3' } });
    expect(input).toHaveValue('0.50');
    view.rerender(<Amount reset />);
    expect(input).toHaveValue('');
  });
});
