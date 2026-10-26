import { fireEvent, render, screen } from '@testing-library/react';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';

import { WebChatSafetyNotice } from '../WebChatSafetyNotice';

describe('WebChatSafetyNotice', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('recommends the mobile app and links both stores', () => {
    render(<WebChatSafetyNotice />);

    expect(screen.getByLabelText('Chat security recommendation')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: /iOS/i }).getAttribute('href'),
    ).toContain('apps.apple.com');
    expect(
      screen.getByRole('link', { name: /Android/i }).getAttribute('href'),
    ).toContain('play.google.com');
  });

  it('starts collapsed and opens its explanation on request', () => {
    const { unmount } = render(<WebChatSafetyNotice />);
    const details = screen.getByText(/Chat works on web/i).closest('details');
    expect(details?.open).toBe(false);

    fireEvent.click(screen.getByText(/Chat works on web/i));
    expect(details?.open).toBe(true);
    expect(screen.getByText(/Browser extensions with access/i)).toBeTruthy();

    unmount();
    render(<WebChatSafetyNotice />);
    expect(screen.getByText(/Chat works on web/i).closest('details')?.open).toBe(false);
  });

  it('still renders and expands when storage throws', () => {
    // The disclosure is native and needs no site storage, including in private windows.
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    render(<WebChatSafetyNotice />);
    expect(screen.getByLabelText('Chat security recommendation')).toBeTruthy();

    expect(() => fireEvent.click(screen.getByText(/Chat works on web/i))).not.toThrow();
    expect(screen.getByText(/Chat works on web/i).closest('details')?.open).toBe(true);
  });
});
