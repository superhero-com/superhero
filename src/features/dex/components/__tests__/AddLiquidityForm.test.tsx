import {
  fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { useState } from 'react';
import type { AddLiquidityState } from '../../types/pool';
import { liquidityEstimate } from '../../utils/liquidityEstimate';
import AddLiquidityForm from '../AddLiquidityForm';

const mocks = vi.hoisted(() => ({
  account: 'ak_test' as string | undefined, execute: vi.fn(), refresh: vi.fn(), clear: vi.fn(), ready: true,
}));
const tokens = [
  {
    address: 'AE', symbol: 'AE', name: 'aeternity', decimals: 18, is_ae: true,
  },
  {
    address: 'ct_test', symbol: 'TEST', name: 'Test token', decimals: 6, is_ae: false,
  },
];
vi.mock('@/hooks', () => ({ useAccount: () => ({ activeAccount: mocks.account }), useDex: () => ({ slippagePct: 5, deadlineMins: 30 }) }));
vi.mock('@/components/dex/hooks/useTokenList', () => ({ useTokenList: () => ({ tokens, loading: false }) }));
vi.mock('@/components/dex/hooks/useTokenBalances', () => ({ useTokenBalances: () => ({ balances: { in: '100', out: '200' } }) }));
vi.mock('../../context/PoolProvider', () => ({ usePool: () => ({ currentAction: null, onPositionUpdated: mocks.refresh, clearSelection: mocks.clear }) }));
vi.mock('@/api/generated', () => ({ DexService: { getDexTokenByAddress: vi.fn() } }));
vi.mock('@/components/ConnectWalletButton', () => ({ ConnectWalletButton: () => <button type="button">Connect wallet</button> }));
vi.mock('@/components/dex/core/TokenSelector', () => ({ default: ({ selected }: { selected: { symbol: string } }) => <button type="button">{selected?.symbol}</button> }));
vi.mock('../LiquidityConfirmation', () => ({ default: ({ show, onConfirm, disabled }: { show: boolean; onConfirm: () => void; disabled: boolean }) => (show ? <button type="button" disabled={disabled} onClick={onConfirm}>Confirm test deposit</button> : null) }));
vi.mock('../../hooks', () => ({
  useAddLiquidity: () => {
    const [state, setState] = useState({
      tokenA: '', tokenB: '', amountA: '', amountB: '', decA: 18, decB: 6, loading: false, error: null,
    } as AddLiquidityState);
    return {
      state: { ...state, pairExists: true, pairPreview: mocks.ready ? liquidityEstimate(state, { reserveA: 100n * 10n ** 18n, reserveB: 200n * 10n ** 6n, totalSupply: 10n * 10n ** 18n }) : null },
      setState,
      executeAddLiquidity: mocks.execute,
      quoteStatus: mocks.ready ? 'ready' : 'error',
      computePairPreview: vi.fn(),
    };
  },
}));
function mount() {
  return render(<MemoryRouter initialEntries={['/defi/pool?from=AE&to=ct_test']}><AddLiquidityForm /></MemoryRouter>);
}
beforeEach(() => { mocks.account = 'ak_test'; mocks.ready = true; mocks.execute.mockResolvedValue('th_result'); });

describe('Add liquidity form', () => {
  it('links either deposit, blocks insufficient balances and waits for review confirmation', async () => {
    mount();
    const first = await screen.findByRole('textbox', { name: 'Deposit AE' });
    const second = await screen.findByRole('textbox', { name: 'Deposit TEST' });
    fireEvent.change(first, { target: { value: '10' } });
    await waitFor(() => expect(second).toHaveValue('20'));
    fireEvent.change(second, { target: { value: '30' } });
    await waitFor(() => expect(first).toHaveValue('15'));
    fireEvent.change(first, { target: { value: '101' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Not enough AE' })).toBeDisabled());
    fireEvent.change(first, { target: { value: '10' } });
    const review = await screen.findByRole('button', { name: 'Review liquidity' });
    await waitFor(() => expect(review).toBeEnabled());
    fireEvent.click(review);
    expect(mocks.execute).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm test deposit' }));
    await waitFor(() => expect(mocks.execute).toHaveBeenCalledWith(expect.objectContaining({
      amountA: '10', amountB: '20', tokenA: 'AE', tokenB: 'ct_test', isAePair: true,
    })));
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
  });
  it('shows connect state without balance shortcuts and blocks unavailable pools', async () => {
    mocks.account = undefined;
    const view = mount();
    await screen.findByRole('textbox', { name: 'Deposit AE' });
    expect(screen.getByRole('button', { name: 'Connect wallet' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Max' })).not.toBeInTheDocument();
    mocks.account = 'ak_other';
    mocks.ready = false;
    view.rerender(<MemoryRouter initialEntries={['/defi/pool?from=AE&to=ct_test']}><AddLiquidityForm /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Pool unavailable' })).toBeDisabled());
    expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled();
  });
});
