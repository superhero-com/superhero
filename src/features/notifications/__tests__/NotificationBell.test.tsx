/**
 * Tests for the production notification UI.
 *
 * The component is where the feature's promises are actually kept or broken — the
 * badge, the "turn it on" gate, deep-linking a row, and re-syncing from REST when
 * the panel opens (the live socket is best-effort and gives up after a bounded
 * number of failures). All of that used to be untested.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import type { UseNotifications } from '../useNotifications';
import type { FeedItem } from '../notification-feed-client';

const mockNavigate = vi.fn();
let mockActiveAccount: string | undefined = 'ak_alice';
let ctx: UseNotifications;

vi.mock('@/hooks', () => ({ useAeSdk: () => ({ activeAccount: mockActiveAccount }) }));
vi.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));
vi.mock('@/components/AddressAvatar', () => ({
  default: ({ address }: { address: string }) => <span data-testid={`avatar-${address}`} />,
}));
vi.mock('../NotificationsContext', () => ({ useNotificationsContext: () => ctx }));

// eslint-disable-next-line import/first
import NotificationBell from '../NotificationBell';

function feedItem(id: number, over: Partial<FeedItem> = {}): FeedItem {
  return {
    id,
    type: 'post-comment',
    title: `title-${id}`,
    body: `body-${id}`,
    data: { commentId: `${id}_v3`, commenter: 'ak_bob' },
    read_at: null,
    created_at: new Date(2026, 0, 1).toISOString(),
    ...over,
  };
}

function ctxValue(over: Partial<UseNotifications> = {}): UseNotifications {
  return {
    connected: true,
    connecting: false,
    error: null,
    items: [],
    unreadCount: 0,
    pushState: 'default',
    pushSupported: true,
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    refresh: vi.fn().mockResolvedValue(undefined),
    markRead: vi.fn().mockResolvedValue(undefined),
    enablePush: vi.fn().mockResolvedValue(undefined),
    disablePush: vi.fn().mockResolvedValue(undefined),
    lastLive: null,
    ...over,
  };
}

/** Render the bell and open its panel. */
function openPanel(over: Partial<UseNotifications> = {}) {
  ctx = ctxValue(over);
  render(<NotificationBell />);
  fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
  return ctx;
}

beforeEach(() => {
  mockActiveAccount = 'ak_alice';
  vi.clearAllMocks();
});

describe('NotificationBell — badge', () => {
  it('renders nothing at all without a connected account', () => {
    mockActiveAccount = undefined;
    ctx = ctxValue({ unreadCount: 3 });
    const { container } = render(<NotificationBell />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the unread count and announces it to a screen reader', () => {
    ctx = ctxValue({ connected: true, unreadCount: 3 });
    render(<NotificationBell />);
    expect(screen.getByRole('button', { name: 'Notifications, 3 unread' })).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
  });

  it('caps the badge at 99+', () => {
    ctx = ctxValue({ connected: true, unreadCount: 1234 });
    render(<NotificationBell />);
    expect(screen.getByText('99+')).toBeTruthy();
  });

  it('shows no badge at zero unread', () => {
    ctx = ctxValue({ connected: true, unreadCount: 0 });
    render(<NotificationBell />);
    expect(screen.getByRole('button', { name: 'Notifications' })).toBeTruthy();
  });
});

describe('NotificationBell — opening the panel', () => {
  it('re-syncs from REST on open', () => {
    // The socket gives up after a bounded number of failures, and this is the only
    // thing that keeps the panel from showing a frozen list until the next reload.
    const value = openPanel({ items: [feedItem(1)] });
    expect(value.refresh).toHaveBeenCalledTimes(1);
  });

  it('survives a rejected refresh rather than breaking the click', () => {
    ctx = ctxValue({ refresh: vi.fn().mockRejectedValue(new Error('offline')) });
    render(<NotificationBell />);
    expect(() => fireEvent.click(screen.getByRole('button', { name: /notifications/i }))).not.toThrow();
    expect(screen.getByRole('dialog', { name: 'Notifications' })).toBeTruthy();
  });

  it('does not re-sync when the click CLOSES the panel', () => {
    const value = openPanel();
    const bell = screen.getByRole('button', { name: /notifications/i });
    fireEvent.click(bell);
    expect(value.refresh).toHaveBeenCalledTimes(1); // the open only
  });

  it('closes on Escape', () => {
    openPanel();
    expect(screen.queryByRole('dialog')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes on an outside mousedown but not on one inside the panel', () => {
    openPanel({ items: [feedItem(1)] });
    fireEvent.mouseDown(screen.getByRole('dialog'));
    expect(screen.queryByRole('dialog')).toBeTruthy();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('NotificationBell — the not-connected gate', () => {
  it('offers the CTA instead of a feed, so signing is always a user gesture', () => {
    const value = openPanel({ connected: false, items: [feedItem(1)] });
    expect(screen.getByText(/to see replies, transfers and room activity/i)).toBeTruthy();
    expect(screen.queryByText('title-1')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^turn on notifications$/i }));
    expect(value.connect).toHaveBeenCalledTimes(1);
  });

  it('disables the CTA and reports progress while connecting', () => {
    openPanel({ connected: false, connecting: true });
    const cta = screen.getByRole('button', { name: /connecting/i });
    expect((cta as HTMLButtonElement).disabled).toBe(true);
  });

  it('surfaces a connect error under the CTA', () => {
    openPanel({ connected: false, error: 'wallet said no' });
    expect(screen.getByText('wallet said no')).toBeTruthy();
  });
});

describe('NotificationBell — rows', () => {
  it('marks a row read and deep-links it', () => {
    const value = openPanel({ items: [feedItem(7)] });
    fireEvent.click(screen.getByText('title-7'));
    expect(value.markRead).toHaveBeenCalledWith([7]);
    expect(mockNavigate).toHaveBeenCalledWith('/post/7');
    expect(screen.queryByRole('dialog')).toBeNull(); // and the panel closes
  });

  it('does not re-mark an already-read row', () => {
    const value = openPanel({ items: [feedItem(7, { read_at: '2026-01-02T00:00:00.000Z' })] });
    fireEvent.click(screen.getByText('title-7'));
    expect(value.markRead).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/post/7');
  });

  it('marks read but does not navigate a row with nowhere to go', () => {
    const value = openPanel({ items: [feedItem(7, { type: 'announcement', data: null })] });
    fireEvent.click(screen.getByText('title-7'));
    expect(value.markRead).toHaveBeenCalledWith([7]);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('renders the actor avatar when the payload names one', () => {
    openPanel({ items: [feedItem(7)] });
    expect(screen.getByTestId('avatar-ak_bob')).toBeTruthy();
  });

  it('shows an empty state rather than a blank panel', () => {
    openPanel({ items: [] });
    expect(screen.getByText(/no notifications yet/i)).toBeTruthy();
  });

  it('swallows a markRead rejection instead of breaking the click', () => {
    openPanel({
      items: [feedItem(7)],
      markRead: vi.fn().mockRejectedValue(new Error('offline')),
    });
    expect(() => fireEvent.click(screen.getByText('title-7'))).not.toThrow();
    expect(mockNavigate).toHaveBeenCalledWith('/post/7'); // still navigates
  });
});

describe('NotificationBell — mark all read', () => {
  it('offers it for a server badge with no unread row loaded', () => {
    // The feed page is capped at 50 while `unreadCount` counts everything, so
    // hiding the button on the loaded rows alone can strand a non-zero badge.
    const value = openPanel({
      unreadCount: 80,
      items: [feedItem(1, { read_at: '2026-01-02T00:00:00.000Z' })],
    });
    fireEvent.click(screen.getByRole('button', { name: /mark all read/i }));
    expect(value.markRead).toHaveBeenCalledWith();
  });

  it('offers it for an unread row even when the badge says zero', () => {
    openPanel({ unreadCount: 0, items: [feedItem(1)] });
    expect(screen.getByRole('button', { name: /mark all read/i })).toBeTruthy();
  });

  it('hides it when there is nothing unread anywhere', () => {
    openPanel({
      unreadCount: 0,
      items: [feedItem(1, { read_at: '2026-01-02T00:00:00.000Z' })],
    });
    expect(screen.queryByRole('button', { name: /mark all read/i })).toBeNull();
  });
});

describe('NotificationBell — browser push', () => {
  it('offers to enable push when it is available but off', () => {
    const value = openPanel({ pushState: 'default' });
    fireEvent.click(screen.getByRole('button', { name: /enable browser push/i }));
    expect(value.enablePush).toHaveBeenCalledTimes(1);
  });

  it('offers to turn push back off once subscribed', () => {
    // Enabling something with no way to disable it is a one-way door: the OS
    // permission cannot be revoked from a web page either.
    const value = openPanel({ pushState: 'subscribed' });
    expect(screen.queryByRole('button', { name: /enable browser push/i })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /turn off/i }));
    expect(value.disablePush).toHaveBeenCalledTimes(1);
  });

  it('offers neither prompt when the browser blocked push', () => {
    openPanel({ pushState: 'denied' });
    expect(screen.queryByRole('button', { name: /enable browser push/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /turn off/i })).toBeNull();
  });

  it('offers neither prompt when the browser has no push support', () => {
    openPanel({ pushSupported: false, pushState: 'unsupported' });
    expect(screen.queryByRole('button', { name: /enable browser push/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /turn off/i })).toBeNull();
  });
});
