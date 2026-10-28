import { fireEvent, render, screen } from '@testing-library/react';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { ShortsLikeDialog } from '../shorts-like-dialog';

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function showModal() { this.open = true; };
  HTMLDialogElement.prototype.close = function close() { this.open = false; };
});
const makeProps = () => ({
  title: 'An original Short',
  pricing: { network: 'ae_uat' as const, likeFeeAetto: '0', treasuryBps: 2000 },
  connected: true,
  busy: false,
  walletPending: false,
  onLike: vi.fn(),
  onConnect: vi.fn(),
  onClose: vi.fn(),
});

describe('Free Like dialog', () => {
  it.each(['ae_uat', 'ae_mainnet'] as const)('shows a free Like and platform network fee coverage on %s', (network) => {
    const props = makeProps();
    const { container } = render(<ShortsLikeDialog
      {...props}
      pricing={{ ...props.pricing, network }}
    />);
    expect(screen.getByRole('dialog', { name: 'Like this Short' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Like' })).toBeEnabled();
    expect(screen.getByText('Show the creator you enjoyed it. Likes are free.')).toBeVisible();
    expect(screen.getByText('Superhero covers the network fee. Confirm the Like in your wallet.')).toBeVisible();
    expect(screen.queryByRole('button', { name: /fee.*split/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/0\.1|0\.08|0\.02|80%|20%/)).not.toBeInTheDocument();
    expect(container.querySelectorAll('dialog[open]')).toHaveLength(1);
    expect(props.onLike).not.toHaveBeenCalled();
    expect(props.onConnect).not.toHaveBeenCalled();
  });

  it('connects a missing wallet without sending a Like, then requires the Like action', () => {
    const props = makeProps();
    const { rerender } = render(<ShortsLikeDialog {...props} connected={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Connect wallet to Like' }));
    expect(props.onConnect).toHaveBeenCalledOnce();
    expect(props.onLike).not.toHaveBeenCalled();
    rerender(<ShortsLikeDialog {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Like' }));
    expect(props.onLike).toHaveBeenCalledOnce();
  });

  it('releases the modal for the wallet and restores a retry after rejection', () => {
    const props = makeProps();
    const { container, rerender } = render(<ShortsLikeDialog {...props} />);
    rerender(<ShortsLikeDialog {...props} busy walletPending />);
    expect(container.querySelectorAll('dialog[open]')).toHaveLength(0);
    rerender(<ShortsLikeDialog {...props} busy />);
    expect(screen.getByRole('button', { name: 'Close Like dialog' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Waiting for wallet & network…' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Waiting for wallet & network…' }));
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(props.onLike).not.toHaveBeenCalled();
    expect(props.onClose).not.toHaveBeenCalled();
    rerender(<ShortsLikeDialog {...props} error="Like cancelled. No Like was sent." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Like cancelled');
    expect(screen.getByRole('button', { name: 'Like' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Like' }));
    expect(props.onLike).toHaveBeenCalledOnce();
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it('closes without sending a transaction', () => {
    const props = makeProps();
    render(<ShortsLikeDialog {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close Like dialog' }));
    expect(props.onClose).toHaveBeenCalledOnce();
    expect(props.onLike).not.toHaveBeenCalled();
  });

  it.each([undefined, '1', '100000000000000000'])('disables an unavailable or paid release (%s)', (likeFeeAetto) => {
    const props = makeProps();
    render(<ShortsLikeDialog
      {...props}
      pricing={likeFeeAetto === undefined ? undefined : { ...props.pricing, likeFeeAetto }}
    />);
    const action = screen.getByRole('button', { name: 'Likes temporarily unavailable' });
    expect(action).toBeDisabled();
    expect(screen.getByText('Network fee sponsorship is temporarily unavailable.')).toBeVisible();
    expect(screen.queryByText(/Superhero covers the network fee/)).not.toBeInTheDocument();
    expect(screen.queryByText('0.1 test AE')).not.toBeInTheDocument();
    fireEvent.click(action);
    expect(props.onLike).not.toHaveBeenCalled();
  });
});
