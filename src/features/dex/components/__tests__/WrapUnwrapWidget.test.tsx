import {
  act, fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { CONFIG } from '../../../../config';
import { WrapUnwrapWidget } from '../../WrapUnwrapWidget';

const mocks = vi.hoisted(() => ({
  account: 'ak_first' as string | undefined,
  ae: '128.45',
  wae: '80.000000000000000003',
  refresh: vi.fn(),
  execute: vi.fn(),
}));
vi.mock('@/hooks', () => ({
  useAeSdk: () => ({ activeAccount: mocks.account }),
  useAccount: () => ({ loadAccountData: mocks.refresh }),
}));
vi.mock('@/components/dex/hooks/useTokenBalances', () => ({ useTokenBalances: () => ({ wrapBalances: { ae: mocks.ae, wae: mocks.wae } }) }));
vi.mock('@/components/dex/hooks/useSwapExecution', () => ({ useSwapExecution: () => ({ executeSwap: mocks.execute, loading: false }) }));
vi.mock('@/components/ConnectWalletButton', () => ({ ConnectWalletButton: () => <button type="button">Connect wallet</button> }));
beforeEach(() => {
  mocks.account = 'ak_first'; mocks.ae = '128.45'; mocks.wae = '80.000000000000000003';
  mocks.refresh.mockReset().mockResolvedValue(undefined);
  mocks.execute.mockReset().mockResolvedValue('th_result');
});
const ready = async () => waitFor(() => expect(screen.getByRole('button', { name: 'Enter an amount' })).toBeDisabled());

describe('Wrap / Unwrap card', () => {
  it('reserves AE on Max and only submits the exact 1:1 conversion after review', async () => {
    render(<WrapUnwrapWidget />);
    await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Max' }));
    expect(screen.getByRole('textbox')).toHaveValue('128.15');
    fireEvent.click(screen.getByRole('button', { name: 'Review wrap' }));
    expect(mocks.execute).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm in wallet' }));
    await waitFor(() => expect(mocks.execute).toHaveBeenCalledWith(expect.objectContaining({
      tokenIn: expect.objectContaining({ address: 'AE' }),
      tokenOut: expect.objectContaining({ address: CONFIG.DEX_WAE }),
      amountIn: '128.15',
      amountOut: '128.15',
      path: [],
      isExactIn: true,
    })));
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue(''));
    expect(mocks.refresh).toHaveBeenCalledWith({ force: true });
  });

  it('preserves all WAE base units for Max and floors half to 18 decimals', async () => {
    render(<WrapUnwrapWidget />);
    await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Unwrap WAE' }));
    fireEvent.click(screen.getByRole('button', { name: '50%' }));
    expect(screen.getByRole('textbox')).toHaveValue('40.000000000000000001');
    fireEvent.click(screen.getByRole('button', { name: 'Max' }));
    expect(screen.getByRole('textbox')).toHaveValue('80.000000000000000003');
    fireEvent.click(screen.getByRole('button', { name: 'Review unwrap' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm in wallet' }));
    await waitFor(() => expect(mocks.execute).toHaveBeenCalledWith(expect.objectContaining({
      tokenIn: expect.objectContaining({ address: CONFIG.DEX_WAE }),
      tokenOut: expect.objectContaining({ address: 'AE' }),
      amountIn: '80.000000000000000003',
      amountOut: '80.000000000000000003',
    })));
  });

  it('blocks duplicates and changes during signing, retaining the review on rejection', async () => {
    let reject: (error: Error) => void = () => {};
    mocks.execute.mockImplementation(() => new Promise((_, fail) => { reject = fail; }));
    render(<WrapUnwrapWidget />);
    await ready();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '1.000000000000000001' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review wrap' }));
    const confirm = screen.getByRole('button', { name: 'Confirm in wallet' });
    fireEvent.click(confirm); fireEvent.click(confirm);
    expect(mocks.execute).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Confirming in wallet…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Reverse conversion' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeDisabled();
    await act(async () => reject(new Error('Rejected by wallet')));
    expect(screen.getByRole('button', { name: 'Confirm in wallet' })).toBeEnabled();
    expect(screen.getByRole('textbox')).toHaveValue('1.000000000000000001');
    expect(screen.getByText('Rejected by wallet')).toBeInTheDocument();
  });

  it('revalidates changed balances and requires native AE for either operation', async () => {
    const view = render(<WrapUnwrapWidget />);
    await ready();
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '128.45' } });
    expect(screen.getByRole('button', { name: 'AE needed for network fee' })).toBeDisabled();
    fireEvent.change(input, { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review wrap' }));
    mocks.ae = '0.5'; view.rerender(<WrapUnwrapWidget />);
    expect(screen.getByRole('button', { name: 'Not enough AE' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Unwrap WAE' }));
    mocks.ae = '0'; view.rerender(<WrapUnwrapWidget />);
    expect(screen.getByRole('button', { name: 'AE needed for network fee' })).toBeDisabled();
    expect(mocks.execute).not.toHaveBeenCalled();
  });

  it('resets on account changes and ignores completion from the old wallet', async () => {
    let resolve: (hash: string) => void = () => {};
    mocks.execute.mockImplementation(() => new Promise((done) => { resolve = done; }));
    const view = render(<WrapUnwrapWidget />);
    await ready();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review wrap' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm in wallet' }));
    mocks.account = 'ak_second'; view.rerender(<WrapUnwrapWidget />);
    await ready();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '3' } });
    await act(async () => resolve('th_old_wallet'));
    expect(screen.getByRole('textbox')).toHaveValue('3');
    expect(mocks.refresh).not.toHaveBeenCalledWith({ force: true });
    mocks.account = undefined; view.rerender(<WrapUnwrapWidget />);
    expect(screen.getByRole('button', { name: 'Connect wallet' })).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('');
    expect(screen.queryByRole('button', { name: 'Max' })).not.toBeInTheDocument();
  });

  it('blocks loading or failed balances and supports retry without submitting', async () => {
    let reject: (error: Error) => void = () => {};
    mocks.refresh.mockImplementationOnce(() => new Promise((_, fail) => { reject = fail; }));
    render(<WrapUnwrapWidget />);
    expect(screen.getByRole('button', { name: 'Loading balances…' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Max' })).not.toBeInTheDocument();
    await act(async () => reject(new Error('offline')));
    expect(screen.getByRole('button', { name: 'Balance unavailable' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await ready();
    expect(mocks.execute).not.toHaveBeenCalled();
  });
});
