import React, { useMemo } from 'react';
import styles from './PollCreatedCard.module.scss';
import FeedPluginCard from '../FeedPluginCard';
import { cn } from '@/lib/utils';

export type PollCreatedCardProps = {
  title: string;
  author?: string;
  closeHeight?: number;
  currentHeight?: number;
  options: { id: number; label: string; votes?: number }[];
  totalVotes?: number;
  onOpen?: () => void;
};

export default function PollCreatedCard({ title, author, closeHeight, currentHeight, options, totalVotes = 0, onOpen }: PollCreatedCardProps) {
  const timeLeft = useMemo(() => {
    if (!closeHeight || !currentHeight) return undefined;
    const blocksLeft = Math.max(0, closeHeight - currentHeight);
    // rough estimate: ~3 minutes per block → convert to hours
    const minutes = blocksLeft * 3;
    if (minutes < 60) return `${minutes}m left`;
    const hours = Math.round(minutes / 60);
    return `${hours}h left`;
  }, [closeHeight, currentHeight]);

  const maxVotes = Math.max(0, ...options.map((o) => o.votes || 0));

  return (
    <FeedPluginCard className={cn(styles.root, 'feed-plugin poll-created')} role={onOpen ? 'button' : undefined} onClick={onOpen}>
      <div className={styles.title}>{title}</div>
      <div className={styles.metaRow}>
        {author && <span>by {author}</span>}
        {timeLeft && <span>• {timeLeft}</span>}
      </div>

      <div className={styles.options}>
        {options.map((o) => {
          const pct = totalVotes > 0 ? Math.round(((o.votes || 0) / totalVotes) * 100) : 0;
          const widthPct = maxVotes > 0 ? Math.max(14, Math.round(((o.votes || 0) / maxVotes) * 100)) : 14;
          return (
            <div key={o.id} className={styles.option} aria-label={`${o.label} ${pct}%`}>
              <div className={styles.bar} style={{ transform: `scaleX(${widthPct / 100})` }} />
              <div className={styles.labelRow}>
                <span>{o.label}</span>
                <span>{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.footer}>
        <span>{totalVotes} votes</span>
        {timeLeft && <span>{timeLeft}</span>}
      </div>
    </FeedPluginCard>
  );
}


