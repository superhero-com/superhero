import React, { useMemo } from 'react';
import styles from './PollCreatedCard.module.scss';
import FeedPluginCard from '../FeedPluginCard';
import { cn } from '@/lib/utils';
import AddressAvatarWithChainNameFeed from '@/@components/Address/AddressAvatarWithChainNameFeed';
import SharePopover from '@/features/social/components/SharePopover';
import BlockchainInfoPopover from '@/features/social/components/BlockchainInfoPopover';
import { CONFIG } from '@/config';
import Spinner from '@/components/Spinner';
import { useChainName } from '@/hooks/useChainName';
import { compactTime } from '@/utils/time';

export type PollCreatedCardProps = {
  title: string;
  description?: string;
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
  txHash?: string;
  contractAddress?: string;
  pendingOption?: number | null;
};

export default function PollCreatedCard({ title, description, author, closeHeight, currentHeight, options, totalVotes = 0, onOpen, createdAtIso, myVote = null, onVoteOption, onRevoke, voting = false, txHash, contractAddress, pendingOption = null }: PollCreatedCardProps) {
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
    <FeedPluginCard
      className={cn(styles.root, 'feed-plugin poll-created px-2 md:px-0')}
      role={onOpen ? 'button' : undefined}
      onClick={() => onOpen?.()}
    >
      {(txHash || contractAddress) && (
        <div className="absolute top-4 right-2 md:top-5 md:right-5 z-10">
          {txHash ? (
            <BlockchainInfoPopover txHash={txHash} createdAt={createdAtIso} sender={author} contract={contractAddress} className="px-2" showLabel label="Poll" />
          ) : (
            <a
              href={`${(CONFIG.EXPLORER_URL || 'https://aescan.io').replace(/\/$/, '')}/contracts/${contractAddress}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-white/[0.04] border border-white/10 hover:border-white/20 no-gradient-text"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="opacity-80">on-chain</span>
              <span aria-hidden>↗</span>
            </a>
          )}
        </div>
      )}
      <div className={cn(styles.metaRow, 'px-0')}>
        {author && (
          <>
            <span className="inline-flex items-center gap-1">
              <AddressAvatarWithChainNameFeed address={author} size={20} overlaySize={12} showAddressAndChainName={false} />
              <span className={cn(styles.byName, 'text-[12px] md:text-[13px]')}>{chainName || 'Legend'}</span>
            </span>
            <span className="text-white/70 text-[12px] md:text-[13px]">created a poll</span>
            {createdAtIso && (
              <>
                <span className="text-white/60 text-[12px] md:text-[13px]">·</span>
                {txHash ? (
                  <BlockchainInfoPopover
                    txHash={txHash}
                    createdAt={createdAtIso}
                    sender={author}
                    contract={contractAddress}
                    triggerContent={
                      <span className="text-[12px] md:text-[13px] text-white/70 whitespace-nowrap">{compactTime(createdAtIso)}</span>
                    }
                    triggerClassName=""
                    label="Poll"
                  />
                ) : (
                  <span className="text-white/60 text-[12px] md:text-[13px]">{compactTime(createdAtIso)}</span>
                )}
              </>
            )}
          </>
        )}
      </div>
      <div className={cn('flex items-center gap-2', 'px-2 md:px-0')}>
        <div
          className={styles.title}
          role={onOpen ? 'button' : undefined}
          onClick={(e) => { e.stopPropagation(); onOpen?.(); }}
        >
          {title}
        </div>
      </div>

      {description && (
        <div className={cn('mt-2 text-[15px] leading-6 whitespace-pre-wrap break-words', 'px-2 md:px-0')}>
          {description}
        </div>
      )}

      {/* Mobile bottom divider for visual rhythm to match other items */}
      <div className="md:hidden pointer-events-none absolute bottom-0 left-[calc(50%-50dvw)] w-[100dvw] h-px bg-white/10" />

      <div className={cn(styles.options, 'px-2 md:px-0')}>
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
                  {voting && pendingOption === o.id && (
                    <>
                      <Spinner />
                      <span className="text-amber-300 text-xs">Pending…</span>
                    </>
                  )}
                  {myVote === o.id && !voting && <span className="text-emerald-300 text-xs">Your vote</span>}
                  <span>{pct}%</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className={cn(styles.footer, 'px-2 md:px-0')}>
        <span className="flex items-center gap-3">
          <span>{totalVotes} votes</span>
          {onRevoke && myVote != null && (
            <button
              type="button"
              className="text-xs text-white/70 hover:underline underline-offset-2 bg-transparent hover:bg-transparent focus:bg-transparent active:bg-transparent border-0 p-0 m-0 h-auto min-h-0 min-w-0 shadow-none hover:shadow-none active:shadow-none ring-0 focus:ring-0 outline-none rounded-none"
              style={{ WebkitAppearance: 'none', background: 'transparent', boxShadow: 'none', WebkitTapHighlightColor: 'transparent', filter: 'none' }}
              onClick={(e) => { e.stopPropagation(); onRevoke(); }}
              disabled={voting}
            >
              Retract vote
            </button>
          )}
        </span>
        <span className="flex items-center gap-3">
          {timeLeft && <span className="text-white/70">{timeLeft}</span>}
          {contractAddress && (
            <SharePopover urlOverride={`/poll/${String(contractAddress)}`} label="poll" />
          )}
        </span>
      </div>
    </FeedPluginCard>
  );
}


