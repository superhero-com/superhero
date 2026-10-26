// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import {
  describe, expect, it, vi,
} from 'vitest';
import { MessageComposer } from '../components/MessageComposer';

describe('message composer keyboard controls', () => {
  it('sends on Enter but leaves Shift+Enter and IME confirmation to the editor', () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    const { unmount } = render(<MessageComposer value="Hello" onChange={vi.fn()} onSend={onSend} disabled={false} isSending={false} />);
    const input = screen.getByRole('textbox', { name: 'Message' });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    expect(onSend).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSend).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('cannot bypass the pending or disconnected send guard with Enter', () => {
    const onSend = vi.fn();
    const { unmount } = render(<MessageComposer value="Draft stays here" onChange={vi.fn()} onSend={onSend} disabled isSending />);
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Message' }), { key: 'Enter' });
    expect(onSend).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: 'Message' })).toHaveProperty('value', 'Draft stays here');
    unmount();
  });
});
