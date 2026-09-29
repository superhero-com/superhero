import { fireEvent, render, screen } from '@testing-library/react';
import {
  describe, expect, it, vi,
} from 'vitest';
import { DexTokenDto } from '../../../../api/generated';
import SwapAmountField from '../SwapAmountField';
import SwapInlineSettings from '../SwapInlineSettings';
import SwapInfoDisplay from '../SwapInfoDisplay';

const { setSlippage, setDeadline } = vi.hoisted(() => ({
  setSlippage: vi.fn(), setDeadline: vi.fn(),
}));
vi.mock('../../../../hooks', () => ({
  useDex: () => ({
    slippagePct: 5, deadlineMins: 30, setSlippage, setDeadline,
  }),
}));
vi.mock('../TokenSelector', () => ({ default: () => <button type="button">Choose token</button> }));
const input = { address: 'ct_input', decimals: 6, symbol: 'IN' } as DexTokenDto;
const output = { address: 'ct_output', decimals: 2, symbol: 'OUT' } as DexTokenDto;
const fieldProps = {
  token: input,
  otherToken: output,
  amount: '',
  balance: '2.469135',
  connected: true,
  pay: true,
  disabled: false,
  tokens: [input, output],
  search: '',
  onSearch: vi.fn(),
  onTokenChange: vi.fn(),
};

describe('swap card controls', () => {
  it('preserves token precision for half and maximum amounts', () => {
    const onAmountChange = vi.fn();
    render(<SwapAmountField {...fieldProps} onAmountChange={onAmountChange} />);
    fireEvent.click(screen.getByRole('button', { name: '50%' }));
    expect(onAmountChange).toHaveBeenLastCalledWith('1.234567');
    fireEvent.click(screen.getByRole('button', { name: 'Max' }));
    expect(onAmountChange).toHaveBeenLastCalledWith('2.469135');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '1.2345678' } });
    expect(onAmountChange).toHaveBeenCalledTimes(2);
  });

  it('does not display a zero wallet balance or shortcuts when disconnected', () => {
    render(<SwapAmountField {...fieldProps} connected={false} balance="0" />);
    expect(screen.getByText('Connect to see your balance')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Max' })).not.toBeInTheDocument();
  });

  it('saves valid settings and rejects deadlines outside the persisted range', () => {
    const onClose = vi.fn();
    render(<SwapInlineSettings id="settings" onClose={onClose} />);
    const save = screen.getByRole('button', { name: 'Save' });
    fireEvent.change(screen.getByLabelText('Transaction deadline in minutes'), { target: { value: '61' } });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Transaction deadline in minutes'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/Custom slippage/), { target: { value: '0' } });
    fireEvent.click(save);
    expect(setSlippage).toHaveBeenCalledWith(0);
    expect(setDeadline).toHaveBeenCalledWith(10);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('uses the router output for minimum received and token decimals for reserves', () => {
    render(<SwapInfoDisplay
      tokenIn={input}
      tokenOut={output}
      amountIn="1"
      amountOut="2"
      tokens={[input, output]}
      onSettings={vi.fn()}
      routeInfo={{
        path: [input.address, output.address],
        routerAmountOut: '1.8',
        reserves: [{
          token0: input.address, token1: output.address, reserve0: '1250000', reserve1: '250',
        }],
      }}
    />);
    expect(screen.getByText('1.710000')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Details' }));
    expect(screen.getByText('1.2500 IN')).toBeInTheDocument();
    expect(screen.getByText('2.5000 OUT')).toBeInTheDocument();
  });
});
