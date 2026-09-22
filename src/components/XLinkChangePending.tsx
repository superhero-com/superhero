import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  X_LINK_CHANGE_EXPECTED_MAX_MS,
  type PendingXLinkChange,
} from '@/utils/confirmedXLink';

/**
 * Share of the bar to fill after `elapsedMs`, paced to the 2–6 minutes people
 * are told to expect. It never reaches the end on time alone: only the API
 * catching up ends the wait, so the bar holds just short of full meanwhile.
 */
export function xLinkChangeProgress(elapsedMs: number): number {
  return Math.min(Math.max(elapsedMs / X_LINK_CHANGE_EXPECTED_MAX_MS, 0), 0.95);
}

/** "m:ss" since the change was sent. */
export function formatXLinkChangeElapsed(elapsedMs: number): string {
  const seconds = Math.floor(Math.max(elapsedMs, 0) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** Milliseconds since `startedAt`, ticking once a second. */
export function useXLinkChangeElapsed(startedAt: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, []);
  return Math.max(0, now - startedAt);
}

export const XLinkChangeProgressBar = ({
  elapsedMs,
  className,
}: {
  elapsedMs: number;
  className?: string;
}) => {
  const { t } = useTranslation('common');
  const percent = Math.round(xLinkChangeProgress(elapsedMs) * 100);
  return (
    <div
      role="progressbar"
      aria-label={t('transactionNotification.xLinkChangeProgressLabel')}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-white/10', className)}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-[var(--neon-teal)] to-cyan-400 transition-[width] duration-1000 ease-linear"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
};

/** The bar with the time so far beside it. */
export const XLinkChangeProgressRow = ({
  elapsedMs,
  className,
}: {
  elapsedMs: number;
  className?: string;
}) => (
  <div className={cn('flex items-center gap-2', className)}>
    <XLinkChangeProgressBar elapsedMs={elapsedMs} className="flex-1" />
    <span className="shrink-0 text-xs tabular-nums text-white/40" dir="ltr">
      {formatXLinkChangeElapsed(elapsedMs)}
    </span>
  </div>
);

/**
 * What the wait sounds like: expected up to six minutes, then honest that it
 * is running long rather than pretending the estimate still holds.
 */
export function xLinkChangeWaitKey(elapsedMs: number): string {
  return elapsedMs > X_LINK_CHANGE_EXPECTED_MAX_MS
    ? 'transactionNotification.xLinkChangeSlow'
    : 'transactionNotification.xLinkChangeWait';
}

/**
 * An X link or unlink on its way: what is happening, how long it usually
 * takes, how long it has been, and a bar that moves. The same block on every
 * screen that would otherwise offer "Link" or "Unlink" during the wait.
 */
export const XLinkChangePending = ({
  change,
  className,
}: {
  change: PendingXLinkChange;
  className?: string;
}) => {
  const { t } = useTranslation('common');
  const elapsed = useXLinkChangeElapsed(change.startedAt);

  let title = t('transactionNotification.linkingXAccount');
  if (change.kind === 'unlink') {
    title = change.username
      ? t('transactionNotification.unlinkingXHandle', { username: `@${change.username}` })
      : t('transactionNotification.unlinkingXAccount');
  }

  return (
    <div
      role="status"
      className={cn('rounded-xl bg-white/[0.06] border border-white/12 px-3 py-2.5', className)}
    >
      <div className="flex items-start gap-2">
        <Loader2 className="mt-0.5 w-4 h-4 shrink-0 animate-spin text-white/60" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="text-sm text-white/85">{title}</div>
          <div className="text-xs leading-relaxed text-white/50">{t(xLinkChangeWaitKey(elapsed))}</div>
        </div>
      </div>
      <XLinkChangeProgressRow elapsedMs={elapsed} className="mt-2" />
    </div>
  );
};

export default XLinkChangePending;
