import { fireEvent, render, screen } from '@testing-library/react';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { ShortsDialog } from '../shorts-dialog';

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function showModal() { this.open = true; };
  HTMLDialogElement.prototype.close = function close() { this.open = false; };
});

describe('Shorts wallet handoff', () => {
  it('releases the native top layer for wallet confirmation and restores the review after rejection', () => {
    const onClose = vi.fn();
    const review = (suspended: boolean, busy: boolean) => (
      <ShortsDialog label="Hosting purchase" suspended={suspended} busy={busy} onClose={onClose}>
        <input aria-label="Budget" defaultValue="0.1" />
      </ShortsDialog>
    );
    const { container, rerender } = render(review(false, false));
    const dialog = container.querySelector('dialog')!;
    fireEvent.change(screen.getByLabelText('Budget'), { target: { value: '0.2' } });
    expect(dialog.open).toBe(true);
    rerender(review(true, true));
    expect(dialog.open).toBe(false);
    expect(onClose).not.toHaveBeenCalled();
    rerender(review(false, false));
    expect(dialog.open).toBe(true);
    expect((screen.getByLabelText('Budget') as HTMLInputElement).value).toBe('0.2');
    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
