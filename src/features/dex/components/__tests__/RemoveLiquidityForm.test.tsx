import {
  act, fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { CONFIG } from '../../../../config';
import type { LiquidityPosition } from '../../types/pool';
import RemoveLiquidityForm from '../RemoveLiquidityForm';

const mocks = vi.hoisted(() => ({
  account: 'ak_test' as string | undefined, status: 'ready', execute: vi.fn(), refresh: vi.fn(), clear: vi.fn(), retry: vi.fn(),
}));
const position = {
  balance: '4000000000000000000',
  token0: CONFIG.DEX_WAE,
  token1: 'ct_other',
  pair: {
    address: 'ct_pool',
    token0: {
      address: CONFIG.DEX_WAE, symbol: 'WAE', name: 'Wrapped AE', decimals: 18,
    },
    token1: {
      address: 'ct_other', symbol: 'TEST', name: 'Test token', decimals: 6,
    },
  },
} as LiquidityPosition;
vi.mock('@/hooks', () => ({ useAccount: () => ({ activeAccount: mocks.account }), useDex: () => ({ slippagePct: 5, deadlineMins: 30 }) }));
vi.mock('../../context/PoolProvider', () => ({ usePool: () => ({ selectedPosition: position, onPositionUpdated: mocks.refresh, clearSelection: mocks.clear }) }));
vi.mock('../../hooks/useAddLiquidity', () => ({ useAddLiquidity: () => ({ executeRemoveLiquidity: mocks.execute }) }));
vi.mock('../../hooks/useRemovalPreview', () => ({ useRemovalPreview: () => ({ status: mocks.status, pool: mocks.status === 'ready' ? { reserveA: 100n * 10n ** 18n, reserveB: 200n * 10n ** 6n, totalSupply: 10n * 10n ** 18n } : undefined, refetch: mocks.retry }) }));
vi.mock('@/components/ConnectWalletButton', () => ({ ConnectWalletButton: () => <button type="button">Connect wallet</button> }));
beforeEach(() => { mocks.account = 'ak_test'; mocks.status = 'ready'; mocks.execute.mockReset().mockResolvedValue('th_result'); mocks.clear.mockClear(); mocks.refresh.mockClear(); });

describe('Remove liquidity form', () => {
  it('shows native AE and token outputs, validates exact input, and confirms exact Max only after review', async () => {
    render(<RemoveLiquidityForm />);
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('WAE is returned as native AE.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'LP' }));
    const input = screen.getByRole('textbox', { name: 'LP tokens to remove' });
    expect(input).toHaveValue('1');
    fireEvent.change(input, { target: { value: '4.000000000000000001' } });
    expect(screen.getByRole('button', { name: 'Check LP amount' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Max' }));
    expect(input).toHaveValue('4');
    fireEvent.click(screen.getByRole('button', { name: 'Removal details' }));
    expect(screen.getByText('38')).toBeInTheDocument();
    expect(screen.getByText('76')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Review removal' }));
    expect(mocks.execute).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm in wallet' }));
    await waitFor(() => expect(mocks.execute).toHaveBeenCalledWith(expect.objectContaining({
      liquidity: '4', isFullRemoval: true, rawBalance: position.balance, isAePair: true, tokenASymbol: 'AE', tokenBSymbol: 'TEST',
    })));
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled());
    expect(mocks.clear).toHaveBeenCalled();
  });
  it('freezes actions during signing and restores the review after rejection', async () => {
    let reject: (error: Error) => void = () => {};
    mocks.execute.mockImplementation(() => new Promise((_, fail) => { reject = fail; }));
    render(<RemoveLiquidityForm />);
    fireEvent.click(screen.getByRole('button', { name: 'Review removal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm in wallet' }));
    expect(screen.getByRole('button', { name: 'Confirming in wallet…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Removal settings' })).toBeDisabled();
    await act(async () => reject(new Error('Declined')));
    expect(screen.getByRole('button', { name: 'Confirm in wallet' })).toBeEnabled();
    expect(mocks.clear).not.toHaveBeenCalled();
  });
  it('blocks unavailable estimates and resets review when the connected wallet changes', () => {
    const view = render(<RemoveLiquidityForm />);
    fireEvent.click(screen.getByRole('button', { name: 'Review removal' }));
    mocks.account = undefined;
    view.rerender(<RemoveLiquidityForm />);
    expect(screen.getByRole('button', { name: 'Connect wallet' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm in wallet' })).not.toBeInTheDocument();
    mocks.account = 'ak_second'; mocks.status = 'error';
    view.rerender(<RemoveLiquidityForm />);
    expect(screen.getByRole('button', { name: 'Estimate unavailable' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(mocks.retry).toHaveBeenCalled();
  });
});
