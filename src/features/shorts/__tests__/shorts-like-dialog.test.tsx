import { act, render, screen } from '@testing-library/react';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { ShortsLikeDialog } from '../shorts-like-dialog';

beforeEach(() => {
  vi.useFakeTimers();
  HTMLDialogElement.prototype.show = vi.fn(function show(this: HTMLDialogElement) { this.open = true; });
  HTMLDialogElement.prototype.showModal = vi.fn(function showModal(this: HTMLDialogElement) { this.open = true; });
  HTMLDialogElement.prototype.close = function close() { this.open = false; };
});
afterEach(() => vi.useRealTimers());

describe('Automatic Like feedback', () => {
  it('stays visible without blocking the wallet or requiring another Like click', () => {
    const onClose = vi.fn();
    const view = render(<ShortsLikeDialog title="An original Short" phase="signing" onClose={onClose} />);
    expect(screen.getByRole('dialog', { name: 'Like this Short' })).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('Confirm the Like in your wallet.');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(HTMLDialogElement.prototype.showModal).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(60000));
    expect(onClose).not.toHaveBeenCalled();
    view.unmount();
  });

  it.each(['cancelled', 'error'] as const)('announces %s with red feedback, then closes automatically', (phase) => {
    const onClose = vi.fn();
    const { container } = render(<ShortsLikeDialog title="Short" phase={phase} onClose={onClose} />);
    expect(screen.getByRole('status')).toHaveTextContent(phase === 'cancelled' ? 'Like cancelled' : 'Like couldn’t be sent');
    expect(container.querySelector(`.is-${phase} .sh-support-cancel-mark`)).not.toBeNull();
    act(() => vi.advanceTimersByTime(1799));
    expect(onClose).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not let an old cancellation timer dismiss a new signing attempt', () => {
    const onClose = vi.fn();
    const { rerender, unmount } = render(<ShortsLikeDialog title="Short" phase="cancelled" onClose={onClose} />);
    act(() => vi.advanceTimersByTime(1000));
    rerender(<ShortsLikeDialog title="Short" phase="signing" onClose={onClose} />);
    act(() => vi.advanceTimersByTime(2000));
    expect(onClose).not.toHaveBeenCalled();
    unmount();
  });
});
