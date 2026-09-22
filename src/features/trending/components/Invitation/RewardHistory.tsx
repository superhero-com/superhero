import { useState, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2, Clock, ExternalLink, Gift, Loader2, Send, Users,
} from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { useXRewardHistory } from '../../../../hooks/useXRewardHistory';
import type { XRewardHistoryItem } from '../../../../api/backend';
import FlameIcon from '../../../../svg/iconFlame.svg?react';

/** Rows shown before "Show all". Enough for a first visit to read at a glance. */
const COLLAPSED_COUNT = 5;

type KindStyle = {
  Icon: ComponentType<{ className?: string }>;
  tint: string;
};

const KIND_STYLES: Record<string, KindStyle> = {
  onboarding: { Icon: Gift, tint: 'bg-cyan-500/15 text-cyan-300' },
  per_post: { Icon: Send, tint: 'bg-blue-500/15 text-blue-300' },
  streak_bonus: { Icon: FlameIcon, tint: 'bg-orange-500/15 text-orange-300' },
  invite_milestone: { Icon: Users, tint: 'bg-violet-500/15 text-violet-300' },
};
const FALLBACK_STYLE: KindStyle = { Icon: Gift, tint: 'bg-white/10 text-white/70' };

type StatusStyle = {
  Icon: ComponentType<{ className?: string }>;
  className: string;
  spin?: boolean;
};

const STATUS_STYLES: Record<string, StatusStyle> = {
  paid: { Icon: CheckCircle2, className: 'bg-emerald-500/15 text-emerald-300' },
  pending: { Icon: Loader2, className: 'bg-cyan-500/15 text-cyan-300', spin: true },
  // Failed sends are retried automatically, so this is a delay, not a loss.
  failed: { Icon: Clock, className: 'bg-amber-500/15 text-amber-300' },
};

type TFunc = (key: string, options?: Record<string, unknown>) => string;

const formatDate = (value: string | null, language: string, utc = false) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  try {
    return new Intl.DateTimeFormat(language, {
      dateStyle: 'medium',
      ...(utc ? { timeZone: 'UTC' } : {}),
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
};

const formatAmount = (amount: string | null, language: string) => {
  if (!amount) return null;
  const n = Number(amount);
  if (!Number.isFinite(n)) return amount;
  try {
    return new Intl.NumberFormat(language, { maximumFractionDigits: 6 }).format(n);
  } catch {
    return amount;
  }
};

const describeItem = (item: XRewardHistoryItem, language: string, t: TFunc) => {
  // A post reward is dated by the post that earned it, which is the date the
  // user will recognise; `post_day` is a UTC calendar day.
  const date = item.kind === 'per_post' && item.post_day
    ? formatDate(`${item.post_day}T00:00:00Z`, language, true)
    : formatDate(item.occurred_at, language);
  const kind = KIND_STYLES[item.kind] ? item.kind : 'unknown';
  const title = t(`rewardsProgram.history.kind.${kind}`);
  const detail = kind === 'unknown'
    ? null
    : t(`rewardsProgram.history.detail.${kind}`, {
      days: item.streak_days ?? '',
      friends: item.invite_count ?? '',
    });
  return { title, date, detail };
};

type HistoryRowProps = { item: XRewardHistoryItem; language: string; t: TFunc };

const HistoryRow = ({ item, language, t }: HistoryRowProps) => {
  const { Icon, tint } = KIND_STYLES[item.kind] ?? FALLBACK_STYLE;
  const statusStyle = STATUS_STYLES[item.status] ?? STATUS_STYLES.pending;
  const StatusIcon = statusStyle.Icon;
  const { title, date, detail } = describeItem(item, language, t);
  const amount = formatAmount(item.amount_ae, language);
  const statusLabel = t(`rewardsProgram.history.status.${STATUS_STYLES[item.status] ? item.status : 'pending'}`);

  const body = (
    <>
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', tint)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-white truncate">{title}</div>
        {/* Wraps to a second line rather than truncating: on a phone the
            status chip leaves too little room for the date and detail. */}
        <div className="text-xs text-white/50 leading-snug line-clamp-2 break-words">
          {[date, detail].filter(Boolean).join(' · ')}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {amount && (
          <span
            // "+10 AE" is one token: in Arabic, bidi reordering shows "AE 10+".
            dir="ltr"
            className={cn(
              'text-sm font-bold tabular-nums',
              item.status === 'paid' ? 'text-emerald-300' : 'text-white/70',
            )}
          >
            {t('rewardsProgram.history.amount', { amount })}
          </span>
        )}
        <span
          className={cn(
            'inline-flex items-center gap-1 text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full',
            statusStyle.className,
          )}
        >
          <StatusIcon className={cn('w-3 h-3', statusStyle.spin && 'motion-safe:animate-spin')} aria-hidden />
          {statusLabel}
        </span>
      </div>
    </>
  );

  const rowClass = 'flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] transition-colors';

  // Only a real transaction gets a link. A payout still being sent has no
  // hash yet, and linking one would open an explorer page that 404s.
  if (!item.explorer_url) {
    return (
      <li className={rowClass}>
        {body}
        {/* Holds the link icon's place, so amounts line up down the list. */}
        <span className="w-4 flex-shrink-0" aria-hidden />
      </li>
    );
  }
  return (
    <li>
      <a
        href={item.explorer_url}
        target="_blank"
        rel="noopener noreferrer"
        title={t('rewardsProgram.history.viewOnAescan')}
        className={cn(
          rowClass,
          'group hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50',
        )}
      >
        {body}
        <ExternalLink
          className="w-4 h-4 flex-shrink-0 text-white/30 transition-colors group-hover:text-cyan-300"
          aria-hidden
        />
        <span className="sr-only">{t('rewardsProgram.history.viewOnAescan')}</span>
      </a>
    </li>
  );
};

type RewardHistoryProps = {
  address: string | null | undefined;
  /** Show the card with an empty state when there is nothing yet (X is linked). */
  showEmpty?: boolean;
  className?: string;
};

/**
 * What the wallet has been paid by the X rewards program, one row per payout,
 * each linked to its transaction on æScan.
 *
 * Rewards are sent automatically with no claim step, so this is the user's
 * receipt: proof each one happened, and where to verify it on-chain.
 */
export const RewardHistory = ({ address, showEmpty = false, className }: RewardHistoryProps) => {
  const { t, i18n } = useTranslation('trending');
  const [expanded, setExpanded] = useState(false);
  const { data, isPending, isError } = useXRewardHistory(address);

  // Hidden, not an error card: the rest of the rewards page works without it,
  // and an API that predates the route answers 404 here.
  if (!address || isError) return null;

  const items = data?.items ?? [];
  // Also covers the first load, so a wallet with nothing to show never gets
  // a skeleton that flashes and disappears.
  if (items.length === 0 && !showEmpty) return null;

  const language = i18n.resolvedLanguage || i18n.language || 'en';
  const visible = expanded ? items : items.slice(0, COLLAPSED_COUNT);

  return (
    <section
      id="reward-history"
      aria-labelledby="reward-history-title"
      className={cn(
        'bg-[#0d1117]/10 backdrop-blur-xl border border-white/10 rounded-2xl p-5 md:p-8 scroll-mt-24',
        className,
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <h3 id="reward-history-title" className="text-lg md:text-xl font-bold text-white m-0">
          {t('rewardsProgram.history.title')}
        </h3>
        {items.length > 0 && (
          <span className="text-xs font-semibold text-white/60 bg-white/10 rounded-full px-2 py-0.5 tabular-nums">
            {items.length}
            {data?.truncated ? '+' : ''}
          </span>
        )}
      </div>
      <p className="text-sm text-white/55 m-0 mb-4 leading-relaxed">
        {t('rewardsProgram.history.subtitle')}
      </p>

      {isPending && (
        <div className="grid gap-2" aria-busy="true">
          {[0, 1].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-white/[0.04] animate-pulse" />
          ))}
        </div>
      )}

      {!isPending && items.length === 0 && (
        <p className="text-sm text-white/45 m-0 p-4 rounded-xl bg-white/[0.03] border border-dashed border-white/10">
          {t('rewardsProgram.history.empty')}
        </p>
      )}

      {visible.length > 0 && (
        <ul className="grid gap-2 m-0 p-0 list-none">
          {visible.map((item, i) => (
            <HistoryRow
              // Rows without a hash (still being sent) have nothing unique but
              // their position and kind.
              key={item.tx_hash ?? `${item.kind}-${item.occurred_at}-${i}`}
              item={item}
              language={language}
              t={t}
            />
          ))}
        </ul>
      )}

      {items.length > COLLAPSED_COUNT && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 w-full rounded-xl py-2 text-sm font-medium text-white/70 bg-white/[0.04] hover:bg-white/[0.08] hover:text-white transition-colors"
        >
          {expanded
            ? t('rewardsProgram.history.showLess')
            : t('rewardsProgram.history.showAll', { total: items.length })}
        </button>
      )}

      {data?.truncated && expanded && (
        <p className="mt-3 text-xs text-white/40 m-0">
          {t('rewardsProgram.history.truncated', { limit: items.length })}
        </p>
      )}
    </section>
  );
};

export default RewardHistory;
