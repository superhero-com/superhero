/**
 * Production notification UI: a header bell + a chat-style dropdown panel.
 * Replaces the raw dev widget (no more `alert()` on live events).
 *
 * Behaviour:
 *   - Reads the shared feed via {@link useNotificationsContext} (one session for
 *     the whole app; safe to mount in several headers at once).
 *   - Not-connected → the panel shows a single "Turn on notifications" CTA, so the
 *     wallet-signature prompt only ever fires from a user gesture (never on load).
 *   - Each row deep-links to its subject (post, wallet, room) and marks itself
 *     read on click — see {@link getNotificationLink}.
 *   - The panel is portalled to <body>: header ancestors set `backdrop-filter`,
 *     which would otherwise make our `position: fixed` panel resolve against the
 *     header box instead of the viewport.
 */
import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Bell, Check } from 'lucide-react';
import moment from 'moment';
import AddressAvatar from '@/components/AddressAvatar';
import { useAeSdk } from '@/hooks';
import { useNotificationsContext } from './NotificationsContext';
import { getNotificationActor, getNotificationLink } from './notificationNavigation';
import type { FeedItem } from './notification-feed-client';

const PANEL_WIDTH = 380;

const ACCENT = '#4ecdc4';

const NotificationRow = ({
  item,
  onClick,
}: {
  item: FeedItem;
  onClick: (clicked: FeedItem) => void;
}) => {
  const actor = getNotificationActor(item);
  const unread = !item.read_at;
  return (
    <button
      type="button"
      onClick={() => onClick(item)}
      className={`w-full text-left flex gap-3 px-4 py-3 transition-colors hover:bg-white/[0.06] focus:bg-white/[0.06] focus:outline-none ${
        unread ? 'bg-white/[0.03]' : ''
      }`}
    >
      <div className="relative flex-shrink-0">
        {actor ? (
          <AddressAvatar address={actor} size={40} />
        ) : (
          <span className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
            <Bell className="w-[18px] h-[18px] text-white/70" />
          </span>
        )}
        {unread && (
          <span
            className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-[#0f0f17]"
            style={{ background: ACCENT }}
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div
          className={`text-[13px] leading-snug truncate ${
            unread ? 'font-semibold text-white' : 'font-medium text-white/80'
          }`}
        >
          {item.title}
        </div>
        <div className="text-[12px] leading-snug text-white/55 mt-0.5 line-clamp-2">
          {item.body}
        </div>
        <div className="text-[11px] text-white/35 mt-1">
          {moment(item.created_at).fromNow()}
        </div>
      </div>
    </button>
  );
};

const NotificationBell = ({ className = '' }: { className?: string }) => {
  const { activeAccount } = useAeSdk();
  const navigate = useNavigate();
  const {
    connected,
    connecting,
    error,
    items,
    unreadCount,
    pushState,
    pushSupported,
    connect,
    refresh,
    markRead,
    enablePush,
    disablePush,
  } = useNotificationsContext();

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [pulse, setPulse] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const prevUnread = useRef(unreadCount);

  const place = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.min(PANEL_WIDTH, window.innerWidth - 16);
    // Right-align the panel to the bell, then clamp inside the viewport.
    let left = r.right - width;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    setPos({ top: r.bottom + 8, left, width });
  }, []);

  const toggle = useCallback(() => {
    setOpen((v) => {
      const next = !v;
      if (next) {
        place();
        // Re-sync from REST on open. The socket is a best-effort layer that gives
        // up after a bounded number of failures (see RecoveryLadder), and this is
        // the only thing that keeps the panel from showing a frozen list until the
        // next reload. A no-op when no session is cached, so it cannot prompt.
        refresh().catch(() => {});
      }
      return next;
    });
  }, [place, refresh]);

  const close = useCallback(() => setOpen(false), []);

  // Outside-click / Esc close; a resize would drift the fixed panel, so close it.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
    };
  }, [open, close]);

  // Subtle pulse ring when a new item arrives — the user-friendly replacement for
  // the old blocking alert().
  useEffect(() => {
    if (unreadCount > prevUnread.current) {
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 1200);
      prevUnread.current = unreadCount;
      return () => clearTimeout(timer);
    }
    prevUnread.current = unreadCount;
    return undefined;
  }, [unreadCount]);

  const onRowClick = useCallback(
    (item: FeedItem) => {
      if (!item.read_at) markRead([item.id]).catch(() => {});
      const link = getNotificationLink(item);
      close();
      if (link) navigate(link);
    },
    [markRead, navigate, close],
  );

  if (!activeAccount) return null;

  // Show "Mark all read" whenever anything is unread — either a visible row OR
  // the server badge (unreadCount), which counts unread items beyond the loaded
  // page (feed limit=50). markRead() with no ids clears ALL unread server-side,
  // so the badge should never be strandable as non-zero with the button hidden.
  const canMarkAllRead = unreadCount > 0 || items.some((it) => !it.read_at);
  const showPushHint = connected
    && pushSupported
    && pushState !== 'subscribed'
    && pushState !== 'denied'
    && pushState !== 'unsupported';
  // Whoever can turn browser push on has to be able to turn it back off from the
  // same place; the OS-level permission alone can't be revoked from a web page.
  const showPushOff = connected && pushSupported && pushState === 'subscribed';

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        // Announce the badge: a screen reader gets "Notifications" either way, so
        // the count is the only part a sighted user has that they don't.
        aria-label={
          connected && unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : 'Notifications'
        }
        aria-expanded={open}
        className={`relative flex items-center justify-center w-10 h-10 rounded-full border border-white/10 bg-white/5 text-[var(--standard-font-color)] transition-colors duration-200 hover:bg-white/10 cursor-pointer ${className}`}
      >
        <Bell className="w-[18px] h-[18px]" />
        {pulse && (
          <span
            className="absolute inset-0 rounded-full animate-ping"
            style={{ boxShadow: `0 0 0 2px ${ACCENT}` }}
          />
        )}
        {connected && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#ff5b5b] text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open
        && pos
        && createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Notifications"
            className="fixed z-[2000] rounded-2xl border border-white/10 bg-[#0f0f17] shadow-[0_12px_40px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden"
            style={{
              top: pos.top,
              left: pos.left,
              width: pos.width,
              maxHeight: 'min(70vh, 560px)',
            }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
              <div className="text-[15px] font-semibold text-white">Notifications</div>
              {connected && canMarkAllRead && (
                <button
                  type="button"
                  onClick={() => markRead().catch(() => {})}
                  className="flex items-center gap-1 text-[12px] font-medium hover:underline"
                  style={{ color: ACCENT }}
                >
                  <Check className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            {!connected ? (
              <div className="px-6 py-10 flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-white/70" />
                </div>
                <div className="text-[13px] text-white/70">
                  Turn on notifications to see replies, transfers and room activity here.
                </div>
                <button
                  type="button"
                  onClick={() => connect()}
                  disabled={connecting}
                  className="mt-1 rounded-full px-4 py-2 text-[13px] font-semibold bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] text-black disabled:opacity-60"
                >
                  {connecting ? 'Connecting…' : 'Turn on notifications'}
                </button>
                {error && <div className="text-[12px] text-rose-400">{error}</div>}
              </div>
            ) : (
              <div className="overflow-y-auto">
                {showPushHint && (
                  <button
                    type="button"
                    onClick={() => enablePush()}
                    className="w-full text-left px-4 py-2.5 text-[12px] bg-white/[0.03] border-b border-white/5 hover:bg-white/[0.06]"
                    style={{ color: ACCENT }}
                  >
                    Enable browser push to get notified when the tab is closed →
                  </button>
                )}
                {showPushOff && (
                  <div className="flex items-center justify-between gap-2 px-4 py-2.5 text-[12px] bg-white/[0.03] border-b border-white/5">
                    <span className="text-white/55">
                      Browser push is on for this device.
                    </span>
                    <button
                      type="button"
                      onClick={() => disablePush()}
                      className="flex-shrink-0 font-medium text-white/70 hover:text-white hover:underline"
                    >
                      Turn off
                    </button>
                  </div>
                )}
                {error && <div className="px-4 py-2 text-[12px] text-rose-400">{error}</div>}
                {items.length === 0 ? (
                  <div className="px-6 py-12 text-center text-[13px] text-white/40">
                    No notifications yet.
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {items.map((it) => (
                      <NotificationRow key={it.id} item={it} onClick={onRowClick} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>,
          document.body,
        )}
    </>
  );
};

export default NotificationBell;
