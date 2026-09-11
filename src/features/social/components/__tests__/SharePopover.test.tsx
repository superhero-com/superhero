import React from 'react';
import {
  fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import SharePopover from '../SharePopover';

const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
const originalExecCommand = Object.getOwnPropertyDescriptor(document, 'execCommand');
const writeText = vi.fn();

describe('SharePopover clipboard actions', () => {
  beforeEach(() => {
    vi.stubGlobal('isSecureContext', true);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  });

  afterEach(() => {
    if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
    else delete (navigator as any).clipboard;
    if (originalExecCommand) Object.defineProperty(document, 'execCommand', originalExecCommand);
    else delete (document as any).execCommand;
  });

  it('handles a rejected clipboard promise without an unhandled error', async () => {
    writeText.mockRejectedValue(new DOMException('Clipboard denied', 'NotAllowedError'));
    render(<SharePopover postId="123_v3" />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Share post' }), { key: 'Enter' });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Copy link' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/post/123`));
  });

  it('uses the clipboard fallback when native share and the clipboard API are unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand });
    render(<SharePopover postId="123_v3" />);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Share post' }), { key: 'Enter' });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Share post' }));

    await waitFor(() => expect(execCommand).toHaveBeenCalledWith('copy'));
    expect(document.querySelector('textarea')).not.toBeInTheDocument();
  });
});
