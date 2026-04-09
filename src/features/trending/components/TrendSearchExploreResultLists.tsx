import AddressAvatar from '@/components/AddressAvatar';
import { Link } from 'react-router-dom';
import { formatAddress } from '@/utils/address';
import { formatCompactNumber } from '@/utils/number';
import type { LeaderboardItem } from '../api/leaderboard';
import type { TrendPostItem, TrendTokenItem, TrendUserItem } from '../api/trendsSearch';
import ReplyToFeedItem from '../../social/components/ReplyToFeedItem';
import TokenListTable from './TokenListTable';

function isLeaderboardItem(item: TrendUserItem | LeaderboardItem): item is LeaderboardItem {
  return 'pnl_usd' in item || 'aum_usd' in item || 'roi_pct' in item || 'mdd_pct' in item;
}

const UserStatsCell = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="text-white/50">{label}</div>
    <div className="text-white">{value}</div>
  </div>
);

function getUserStats(item: TrendUserItem | LeaderboardItem) {
  if (isLeaderboardItem(item)) {
    return [
      { label: 'PnL', value: `$${formatCompactNumber(item.pnl_usd, 2, 1)}` },
      { label: 'ROI', value: `${formatCompactNumber(item.roi_pct, 2, 1)}%` },
      { label: 'AUM', value: `$${formatCompactNumber(item.aum_usd, 2, 1)}` },
    ];
  }

  return [
    { label: 'Volume', value: `${formatCompactNumber(item.total_volume, 2, 1)} AE` },
    { label: 'Txs', value: formatCompactNumber(item.total_tx_count, 0, 1) },
    { label: 'Created', value: formatCompactNumber(item.total_created_tokens, 0, 1) },
  ];
}

export const TokenResultsList = ({ items }: { items: TrendTokenItem[] }) => (
  <TokenListTable
    pages={[{ items }]}
    loading={false}
    orderBy="market_cap"
    orderDirection="DESC"
    onSort={() => {}}
  />
);

export const UserResultsList = ({ items }: { items: Array<TrendUserItem | LeaderboardItem> }) => (
  <>
    {items.map((item) => {
      const { address } = item;
      const title = item.chain_name || formatAddress(address, 6);
      const stats = getUserStats(item);

      return (
        <Link
          key={address}
          to={`/users/${address}`}
          className="flex flex-col gap-3 px-1 py-4 text-white transition-colors hover:bg-white/[0.03] hover:text-white rounded-xl sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3 min-w-0">
            <AddressAvatar address={address} size={40} borderRadius="50%" />
            <div className="min-w-0">
              <div className="text-[15px] font-semibold text-white truncate">{title}</div>
              <div className="text-[10px] text-white/60 font-mono truncate">
                {formatAddress(address, 10, false)}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3 sm:text-right sm:min-w-[340px]">
            {stats.map((s) => (
              <UserStatsCell key={s.label} label={s.label} value={s.value} />
            ))}
          </div>
        </Link>
      );
    })}
  </>
);

export const PostResultsList = ({
  items,
  onOpenPost,
}: {
  items: TrendPostItem[];
  onOpenPost: (slugOrId: string) => void;
}) => (
  <>
    {items.map((post) => (
      <ReplyToFeedItem
        key={post.id}
        item={post}
        commentCount={post.total_comments ?? 0}
        allowInlineRepliesToggle={false}
        onOpenPost={onOpenPost}
      />
    ))}
  </>
);
