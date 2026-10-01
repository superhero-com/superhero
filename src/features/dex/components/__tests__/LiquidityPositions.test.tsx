import {
  fireEvent, render, screen, waitFor, within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  describe, expect, it, vi,
} from 'vitest';
import type { LiquidityPosition } from '../../types/pool';
import LiquidityPositionsPanel from '../LiquidityPositionsPanel';
import { liquidityPositionValues } from '../../utils/liquidityPositionValues';

const mocks = vi.hoisted(() => ({ copy: vi.fn(async () => true) }));
vi.mock('@/components/ConnectWalletButton', () => ({ ConnectWalletButton: () => <button type="button">Connect wallet</button> }));
vi.mock('@/utils/address', async (importOriginal) => ({ ...await importOriginal<typeof import('@/utils/address')>(), copyToClipboard: mocks.copy }));
const position = {
  balance: '1000000000000000000',
  token0: 'ct_first',
  token1: 'ct_second',
  pair: {
    address: 'ct_2AfnEfCSPx4A6VjMBfDfqHNYcqDJjuJjGV1qhqP5qNKNBvYfE2',
    token0: {
      address: 'ct_first', symbol: 'FIRST', name: 'First Token', decimals: 18,
    },
    token1: {
      address: 'ct_second', symbol: 'SECOND', name: 'Second Token', decimals: 6,
    },
    total_supply: '100000000000000000000',
    reserve0: '123000000000000000000',
    reserve1: '9876000000',
  },
} as LiquidityPosition;
const base = () => ({
  connected: true, positions: [position], loading: false, error: null, onRefresh: vi.fn(), onAdd: vi.fn(), onRemove: vi.fn(),
});
function mount(props = base()) {
  return render(<MemoryRouter><LiquidityPositionsPanel {...props} /></MemoryRouter>);
}

describe('liquidity positions', () => {
  it('converts raw reserves with each token’s decimals and preserves LP dust', () => {
    expect(liquidityPositionValues(position)).toEqual({
      lpBalance: '1', sharePct: '1', amount0: '1.23', amount1: '98.76',
    });
    const dust = liquidityPositionValues({ ...position, balance: '1' });
    expect(dust.lpBalance).toBe('0.000000000000000001');
    expect(dust.amount0).toBe('0.000000000000000001');
    expect(dust.amount1).toBe('0');
  });
  it('distinguishes zero reserves from missing, invalid or inconsistent data', () => {
    const noSupply = liquidityPositionValues({ ...position, pair: { ...position.pair, total_supply: '0' } });
    expect(noSupply.amount0).toBeUndefined();
    expect(noSupply.sharePct).toBeUndefined();
    const invalid = liquidityPositionValues({ ...position, balance: '-1' });
    expect(invalid.lpBalance).toBeUndefined();
    expect(invalid.amount1).toBeUndefined();
    expect(liquidityPositionValues({ ...position, balance: '100000000000000000001' }).sharePct).toBeUndefined();
    const zero = liquidityPositionValues({ ...position, pair: { ...position.pair, reserve1: '0' } });
    expect(zero.amount1).toBe('0');
  });
  it('shows underlying assets and preserves add, remove, copy and pool links', async () => {
    const props = base();
    mount(props);
    const card = screen.getByRole('article', { name: 'FIRST / SECOND' });
    expect(within(card).getByText('1.23')).toBeInTheDocument();
    expect(within(card).getByText('98.76')).toBeInTheDocument();
    expect(within(card).getByText('1%')).toBeInTheDocument();
    fireEvent.click(within(card).getByRole('button', { name: 'Add' }));
    expect(props.onAdd).toHaveBeenCalledWith(position);
    fireEvent.click(within(card).getByRole('button', { name: 'Remove' }));
    expect(props.onRemove).toHaveBeenCalledWith(position);
    fireEvent.click(within(card).getByRole('button', { name: /1 LP Tokens/i }));
    expect(screen.getByText(position.pair.address)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View pool' })).toHaveAttribute('href', `/defi/explore/pools/${position.pair.address}`);
    fireEvent.click(screen.getByRole('button', { name: 'Copy pair contract' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument());
    expect(mocks.copy).toHaveBeenCalledWith(position.pair.address);
  });
  it('hides account data when disconnected and shows distinct loading, empty and error states', () => {
    const props = { ...base(), connected: false };
    const view = mount(props);
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect wallet' })).toBeInTheDocument();
    view.rerender(<MemoryRouter><LiquidityPositionsPanel {...props} connected positions={[]} loading /></MemoryRouter>);
    expect(screen.getByText('Finding your positions…')).toBeInTheDocument();
    view.rerender(<MemoryRouter><LiquidityPositionsPanel {...props} connected positions={[]} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Add liquidity' }));
    expect(props.onAdd).toHaveBeenCalledWith();
    view.rerender(<MemoryRouter><LiquidityPositionsPanel {...props} connected positions={[]} error="offline" /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(props.onRefresh).toHaveBeenCalled();
    expect(screen.queryByText('$0.00')).not.toBeInTheDocument();
  });
  it('retains loaded positions on refresh errors and disables refresh during loading', () => {
    const props = { ...base(), error: 'offline' };
    const view = mount(props);
    expect(screen.getByRole('article')).toBeInTheDocument();
    expect(screen.getByText('Couldn’t refresh. Showing your last loaded positions.')).toBeInTheDocument();
    view.rerender(<MemoryRouter><LiquidityPositionsPanel {...props} loading /></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Refresh positions' })).toBeDisabled();
  });
});
