import React, { useMemo } from 'react';
import styles from './PollCreatedCard.module.scss';
import FeedPluginCard from '../FeedPluginCard';
import { cn } from '@/lib/utils';
import AddressAvatarWithChainNameFeed from '@/@components/Address/AddressAvatarWithChainNameFeed';
import { useChainName } from '@/hooks/useChainName';
import { compactTime } from '@/utils/time';

export type PollCreatedCardProps = {
  title: string;
  author?: string;
  closeHeight?: number;
  currentHeight?: number;
  options: { id: number; label: string; votes?: number }[];
  totalVotes?: number;
  onOpen?: () => void;
  createdAtIso?: string;
  myVote?: number | null;
  onVoteOption?: (id: number) => void;
  onRevoke?: () => void;
  voting?: boolean;
};

export default function PollCreatedCard({ title, author, closeHeight, currentHeight, options, totalVotes = 0, onOpen, createdAtIso, myVote = null, onVoteOption, onRevoke, voting = false }: PollCreatedCardProps) {
  const { chainName } = useChainName(author || '');
  const timeLeft = useMemo(() => {
    if (!closeHeight || !currentHeight) return undefined;
    const blocksLeft = Math.max(0, closeHeight - currentHeight);
    const ms = blocksLeft * 3 * 60 * 1000; // ~3 minutes per block
    const seconds = Math.max(1, Math.floor(ms / 1000));
    if (seconds < 60) return `${seconds}s left`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m left`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h left`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d left`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} left`;
    const months = Math.floor(days / 30.4375); // average days/month
    if (months < 12) return `${months} ${months === 1 ? 'month' : 'months'} left`;
    const years = Math.floor(days / 365.25);
    return `${years} ${years === 1 ? 'year' : 'years'} left`;
  }, [closeHeight, currentHeight]);

  const maxVotes = Math.max(0, ...options.map((o) => o.votes || 0));

  return (
    <FeedPluginCard className={cn(styles.root, 'feed-plugin poll-created')} role={onOpen ? 'button' : undefined} onClick={onOpen}>
      <div className={styles.metaRow}>
        {author && (
          <>
            <span className="inline-flex items-center gap-1">
              <AddressAvatarWithChainNameFeed address={author} size={20} overlaySize={12} showAddressAndChainName={false} />
              <span className={styles.byName}>{chainName || 'Legend'}</span>
            </span>
            <span className="text-white/70">created a poll</span>
            {createdAtIso && <span className="text-white/60">· {compactTime(createdAtIso)}</span>}
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className={styles.title}>{title}</div>
      </div>

      {/* Mobile bottom divider for visual rhythm to match other items */}
      <div className="md:hidden pointer-events-none absolute bottom-0 left-[calc(50%-50dvw)] w-[100dvw] h-px bg-white/10" />

      <div className={styles.options}>
        {options.map((o) => {
          const pct = totalVotes > 0 ? Math.round(((o.votes || 0) / totalVotes) * 100) : 0;
          const widthPct = maxVotes > 0 ? Math.max(14, Math.round(((o.votes || 0) / maxVotes) * 100)) : 14;
          return (
            <div
              key={o.id}
              className={cn(styles.option, myVote === o.id && styles.optionSelected)}
              aria-label={`${o.label} ${pct}%`}
              onClick={(e) => { e.stopPropagation(); onVoteOption?.(o.id); }}
              role={onVoteOption ? 'button' : undefined}
            >
              <div className={styles.bar} style={{ transform: `scaleX(${widthPct / 100})` }} />
              <div className={styles.labelRow}>
                <span className={cn(myVote === o.id && styles.labelSelected)}>{o.label}</span>
                <span className="flex items-center gap-2">
                  {myVote === o.id && <span className="text-emerald-300 text-xs">Your vote</span>}
                  <span>{pct}%</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.footer}>
        <span>{totalVotes} votes</span>
        <span className="flex items-center gap-3">
          {onRevoke && myVote != null && (
            <button type="button" className="text-xs text-white/70 hover:text-white underline underline-offset-2" onClick={(e) => { e.stopPropagation(); onRevoke(); }} disabled={voting}>
              Retract vote
            </button>
          )}
          {timeLeft && <span>{timeLeft}</span>}
        </span>
      </div>
    </FeedPluginCard>
  );
}


