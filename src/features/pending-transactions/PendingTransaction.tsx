import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Where a transaction is: sent, in a block, or showing in the app. */
export type PendingTransactionStage = 'sent' | 'confirmed' | 'live';

const STAGES: PendingTransactionStage[] = ['sent', 'confirmed', 'live'];

const STAGE_LABEL_KEYS: Record<PendingTransactionStage, string> = {
  sent: 'pendingTransaction.stepSent',
  confirmed: 'pendingTransaction.stepConfirmed',
  live: 'pendingTransaction.stepLive',
};

const STAGE_STATUS_KEYS: Record<PendingTransactionStage, string> = {
  sent: 'pendingTransaction.statusSent',
  confirmed: 'pendingTransaction.statusConfirmed',
  live: 'pendingTransaction.statusLive',
};

// Done steps are filled, the current one is ringed, the rest are dim. At
// `live` the last step is done too: there is nothing left to wait for.
function stepCircleClass(index: number, reached: number, live: boolean): string {
  if (index < reached || (live && index === reached)) return 'bg-[var(--neon-teal)] text-[#0a0a0f]';
  if (index === reached) return 'bg-[var(--neon-teal)]/20 text-[var(--neon-teal)] ring-1 ring-[var(--neon-teal)]';
  return 'bg-white/10 text-white/30';
}

/** "m:ss" since the transaction was sent. */
export function formatPendingElapsed(elapsedMs: number): string {
  const seconds = Math.floor(Math.max(elapsedMs, 0) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** Milliseconds since `startedAt`, ticking once a second. */
function useElapsed(startedAt: number | null | undefined): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!startedAt) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(id);
  }, [startedAt]);
  return startedAt ? Math.max(0, now - startedAt) : null;
}

/** How much of the bar is filled at each stage: real steps, not a guess at time. */
export function pendingTransactionProgress(stage: PendingTransactionStage): number {
  return Math.round(((STAGES.indexOf(stage) + 1) / STAGES.length) * 100);
}

type PendingTransactionProps = {
  /** What is happening, e.g. "Creating #TOKEN" or "Unlinking @handle…". */
  title: ReactNode;
  stage: PendingTransactionStage;
  /** When it was sent; shows the time so far. */
  startedAt?: number | null;
  /**
   * `inline`: a card in the page. `floating`: pinned over the page (the
   * token page after creating a token). `compact`: inside the top banner,
   * which draws its own card.
   */
  variant?: 'inline' | 'floating' | 'compact';
  onDismiss?: () => void;
  className?: string;
};

/**
 * The one way the app shows a transaction on its way, wherever it is and
 * whatever it is: the same steps, the same words, the same bar. Only the
 * title changes.
 *
 * It never promises a time. The wait is the blockchain and then the
 * indexer, and both vary, so it says it takes a while and that leaving is
 * fine: what was sent is kept, and the next visit picks it back up.
 */
export const PendingTransaction = ({
  title,
  stage,
  startedAt,
  variant = 'inline',
  onDismiss,
  className,
}: PendingTransactionProps) => {
  const { t } = useTranslation('common');
  const elapsed = useElapsed(stage === 'live' ? null : startedAt);
  const reached = STAGES.indexOf(stage);
  const live = stage === 'live';
  const percent = pendingTransactionProgress(stage);
  const compact = variant === 'compact';

  const body = (
    <>
      {!compact && (
        <ol className="m-0 mb-3 flex list-none items-center p-0" aria-hidden>
          {STAGES.map((step, index) => (
            <li key={step} className={cn('flex items-center', index > 0 && 'flex-1')}>
              {index > 0 && (
                <span
                  className={cn(
                    'mx-1.5 mb-3.5 h-px flex-1 transition-colors duration-700',
                    index <= reached ? 'bg-[var(--neon-teal)]' : 'bg-white/15',
                  )}
                />
              )}
              <span className="flex flex-col items-center gap-0.5">
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-colors duration-500',
                    stepCircleClass(index, reached, live),
                  )}
                >
                  {index < reached || (live && index === reached)
                    ? <Check className="h-3 w-3" strokeWidth={3} />
                    : index + 1}
                </span>
                <span className="text-[9px] font-medium text-white/50">{t(STAGE_LABEL_KEYS[step])}</span>
              </span>
            </li>
          ))}
        </ol>
      )}

      <div className="flex items-start gap-3">
        {!compact && (
          <span className="relative mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--neon-teal)] to-[#44a08d]">
            {live
              ? <Check className="h-4 w-4 text-white" strokeWidth={2.5} aria-hidden />
              : <Clock className="h-4 w-4 text-white" aria-hidden />}
            {!live && (
              <span className="absolute inset-0 animate-ping rounded-full bg-[var(--neon-teal)] opacity-25" aria-hidden />
            )}
          </span>
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <p className="m-0 text-sm font-bold leading-snug text-white">{title}</p>
          <p className="m-0 text-xs leading-relaxed text-white/60">{t(STAGE_STATUS_KEYS[stage])}</p>
          {!live && (
            <p className="m-0 text-xs leading-relaxed text-white/45">{t('pendingTransaction.takesAWhile')}</p>
          )}
          <div className="flex items-center gap-2 pt-1">
            <div
              role="progressbar"
              aria-label={t('pendingTransaction.progressLabel')}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              className="h-1 flex-1 overflow-hidden rounded-full bg-white/10"
            >
              <div
                className={cn(
                  'h-full rounded-full bg-gradient-to-r from-[var(--neon-teal)] to-[#7fffd4] transition-[width] duration-700',
                  !live && 'animate-pulse',
                )}
                style={{ width: `${percent}%` }}
              />
            </div>
            {elapsed !== null && (
              <span className="shrink-0 text-[11px] tabular-nums text-white/40" dir="ltr">
                {formatPendingElapsed(elapsed)}
              </span>
            )}
          </div>
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="mt-0.5 shrink-0 text-white/30 transition-colors hover:text-white/80"
            aria-label={t('pendingTransaction.dismiss')}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
    </>
  );

  // The banner around it is already announced and dismissable as a whole.
  if (compact) {
    return <div className={cn('min-w-0', className)}>{body}</div>;
  }

  const card = (
    <div
      role="status"
      className={cn(
        'rounded-2xl border border-[var(--neon-teal)]/30 bg-[#0d1f1e] p-4',
        variant === 'floating' && 'shadow-[0_8px_40px_rgba(78,205,196,0.18)] backdrop-blur-xl animate-in slide-in-from-top duration-400',
        variant === 'inline' && className,
      )}
    >
      {body}
    </div>
  );

  if (variant === 'floating') {
    return (
      <div
        className={cn(
          'fixed left-4 right-4 top-[calc(var(--mobile-navigation-height,0px)+env(safe-area-inset-top,0px)+1rem)] z-[9999] w-auto md:left-auto md:right-6 md:top-6 md:max-w-sm',
          className,
        )}
      >
        {card}
      </div>
    );
  }
  return card;
};

export default PendingTransaction;
