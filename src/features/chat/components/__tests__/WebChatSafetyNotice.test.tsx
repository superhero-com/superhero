import { fireEvent, render, screen } from '@testing-library/react';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';

import { WebChatSafetyNotice } from '../WebChatSafetyNotice';

const DISMISS_KEY = 'superhero:chat:web-safety-notice-dismissed';

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

  it('stays dismissed once dismissed', () => {
    const { unmount } = render(<WebChatSafetyNotice />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Dismiss chat security recommendation' }),
    );
    expect(screen.queryByLabelText('Chat security recommendation')).toBeNull();
    expect(localStorage.getItem(DISMISS_KEY)).toBe('1');

    unmount();
    render(<WebChatSafetyNotice />);
    expect(screen.queryByLabelText('Chat security recommendation')).toBeNull();
  });

  it('still renders and still dismisses when storage throws', () => {
    // Private windows and blocked site data make both calls throw. Chat must
    // not break over a dismissal preference.
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    render(<WebChatSafetyNotice />);
    expect(screen.getByLabelText('Chat security recommendation')).toBeTruthy();

    expect(() => fireEvent.click(
      screen.getByRole('button', { name: 'Dismiss chat security recommendation' }),
    )).not.toThrow();
    expect(screen.queryByLabelText('Chat security recommendation')).toBeNull();
  });
});
