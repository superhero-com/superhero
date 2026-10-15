import {
  fireEvent, render, screen, within,
} from '@testing-library/react';
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
  pricing: { network: 'ae_uat' as const, likeFeeAetto: '100000000000000000', treasuryBps: 2000 },
  connected: true,
  busy: false,
  walletPending: false,
  onLike: vi.fn(),
  onConnect: vi.fn(),
  onClose: vi.fn(),
});

describe('Creator support dialog', () => {
  it('shows the actual split and rounding on a different release without testnet copy', () => {
    const props = makeProps();
    const { container } = render(<ShortsLikeDialog
      {...props}
      pricing={{
        network: 'ae_mainnet', likeFeeAetto: '3', treasuryBps: 3333,
      }}
    />);
    expect(screen.getByRole('button', { name: 'Send a Like · 0.000000000000000003 AE' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'How the Like fee is split' }));
    expect(screen.getByText('66.67%')).toBeVisible();
    expect(screen.getByText('33.33%')).toBeVisible();
    expect(within(screen.getByRole('dialog', { name: 'How your Like is shared' }))
      .getByText('0.000000000000000003 AE')).toBeVisible();
    expect(screen.getByText('0 AE')).toBeVisible();
    expect(screen.getByText('Any rounding remainder goes to the creator.')).toBeVisible();
    expect(screen.queryByText(/testnet/i)).not.toBeInTheDocument();
    const bars = container.querySelectorAll<HTMLElement>('.sh-support-split span');
    expect(bars[0].style.flexGrow).toBe('66.67');
    expect(bars[1].style.flexGrow).toBe('33.33');
    expect(props.onLike).not.toHaveBeenCalled();
  });

  it('opens fee details without a payment and restores focus when returning', () => {
    const props = makeProps();
    const { container } = render(<ShortsLikeDialog {...props} />);
    expect(screen.getByRole('button', { name: 'Send a Like · 0.1 test AE' })).toBeEnabled();
    expect(screen.queryByText('0.08 test AE')).not.toBeInTheDocument();
    const info = screen.getByRole('button', { name: 'How the Like fee is split' });
    fireEvent.click(info);
    expect(screen.getByRole('dialog', { name: 'How your Like is shared' })).toBeVisible();
    expect(container.querySelectorAll('dialog[open]')).toHaveLength(1);
    expect(screen.getByText('0.08 test AE')).toBeVisible();
    expect(screen.getByText('0.02 test AE')).toBeVisible();
    expect(screen.getByText('Network fee is separate')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Back to supporting' }));
    expect(info).toHaveFocus();
    expect(screen.getByRole('dialog', { name: 'Support this creator' })).toBeVisible();
    expect(props.onLike).not.toHaveBeenCalled();
    expect(props.onConnect).not.toHaveBeenCalled();
    expect(props.onClose).not.toHaveBeenCalled();
    fireEvent.click(info);
    fireEvent(screen.getByRole('dialog', { name: 'How your Like is shared' }), new Event('cancel', { cancelable: true }));
    expect(info).toHaveFocus();
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('connects a missing wallet without paying, then offers the single paid Like', () => {
    const props = makeProps();
    const { rerender } = render(<ShortsLikeDialog {...props} connected={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Connect wallet to Like' }));
    expect(props.onConnect).toHaveBeenCalledOnce();
    expect(props.onLike).not.toHaveBeenCalled();
    rerender(<ShortsLikeDialog {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Send a Like · 0.1 test AE' }));
    expect(props.onLike).toHaveBeenCalledOnce();
  });

  it('releases the modal for the wallet and restores a retry after rejection', () => {
    const props = makeProps();
    const { container, rerender } = render(<ShortsLikeDialog {...props} />);
    rerender(<ShortsLikeDialog {...props} busy walletPending />);
    expect(container.querySelectorAll('dialog[open]')).toHaveLength(0);
    rerender(<ShortsLikeDialog {...props} busy />);
    expect(screen.getByRole('button', { name: 'How the Like fee is split' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Waiting for wallet & network…' })).toBeDisabled();
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(props.onClose).not.toHaveBeenCalled();
    rerender(<ShortsLikeDialog {...props} error="Payment cancelled. No Like was sent." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Payment cancelled');
    expect(screen.getByRole('button', { name: 'Send a Like · 0.1 test AE' })).toBeEnabled();
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
    expect(props.onClose).toHaveBeenCalledOnce();
    expect(props.onLike).not.toHaveBeenCalled();
  });
});

it('disables an unverified payment without displaying an unverified price', () => {
  const props = makeProps();
  render(<ShortsLikeDialog {...props} pricing={undefined} />);
  expect(screen.getByRole('button', { name: 'Likes temporarily unavailable' })).toBeDisabled();
  expect(screen.queryByText('0.1 test AE')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Likes temporarily unavailable' }));
  expect(props.onLike).not.toHaveBeenCalled();
});
