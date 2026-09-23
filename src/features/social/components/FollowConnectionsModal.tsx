import {
  useEffect, useMemo, useRef, useState,
} from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Inbox, Search, SearchX, TriangleAlert, X,
} from 'lucide-react';
import AddressAvatar from '../../../components/AddressAvatar';
import { Input } from '../../../components/ui/input';
import Spinner from '../../../components/Spinner';
import {
  useSocialConnections,
  type ConnectionsDirection,
} from '../../../hooks/useSocialConnections';
import type { SocialGraphAccount } from '../../../api/socialGraphConnections';
import { formatAddress } from '../../../utils/address';

type Props = {
  address: string;
  initialTab?: ConnectionsDirection;
  followersCount?: number | null;
  followingCount?: number | null;
  onClose?: () => void;
};

const TABS: ConnectionsDirection[] = ['followers', 'following'];
const AUTO_PAGE_LIMIT = 5;

// One row of a followers/following list: the identity the API already resolved,
// so no per-row name lookup. Navigating to the profile closes the modal — react
// navigation keeps modal state otherwise, leaving the sheet stranded over the
// new page.
const ConnectionRow = (
  { account, onNavigate }: { account: SocialGraphAccount; onNavigate: () => void },
) => {
  const { address, public_name: publicName } = account;
  const showName = publicName && publicName !== address;
  return (
    <Link
      to={`/users/${address}`}
      onClick={onNavigate}
      className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/[0.06] transition-colors"
    >
      <AddressAvatar address={address} size={40} />
      <div className="min-w-0 flex-1">
        {showName && (
          <div className="truncate text-sm font-semibold text-white">{publicName}</div>
        )}
        {/* Not AddressFormatted: its Truncate forces bold 14px and marquee-scrolls. */}
        <div className={`font-mono ${showName ? 'text-[12px] font-normal text-white/55' : 'text-sm text-white/80'}`}>
          {formatAddress(address, 10)}
        </div>
      </div>
    </Link>
  );
};

/**
 * Followers / following for one account, opened from the profile count tiles.
 * Two tabs share a search box and an infinite, keyset-paged list; the connected
 * account's own follow/unfollow/block controls live on the profile, untouched.
 */
const FollowConnectionsModal = ({
  address, initialTab = 'followers', followersCount, followingCount, onClose,
}: Props) => {
  const { t } = useTranslation('common');
  const [tab, setTab] = useState<ConnectionsDirection>(initialTab);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  // Debounce so a keystroke does not fire a request per character.
  useEffect(() => {
    const id = window.setTimeout(() => setSearch(searchInput), 300);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const {
    items,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    data,
  } = useSocialConnections(tab, address, search);

  const hasSearch = search.trim().length > 0;

  const sentinelRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (isLoading || typeof window.IntersectionObserver !== 'function') return undefined;
    // Sparse searches can span millions of slots. Bound automatic work and keep
    // the continuation button available for deliberate further scanning.
    if ((data?.pages.length ?? 0) >= AUTO_PAGE_LIMIT) return undefined;
    const sentinel = sentinelRef.current;
    if (!sentinel) return undefined;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry.isIntersecting) return;
      if (!hasNextPage || isFetchingNextPage) return;
      fetchNextPage();
    }, { root: null, rootMargin: '300px 0px', threshold: 0.01 });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [isLoading, hasNextPage, isFetchingNextPage, fetchNextPage, tab, search, data?.pages.length]);

  const body = useMemo(() => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-white/60">
          <Spinner />
          <span className="text-sm">{t('socialGraph.list.loading')}</span>
        </div>
      );
    }
    if (isError) {
      return (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <TriangleAlert aria-hidden className="h-[30px] w-[30px] text-white/35" />
          <p className="text-sm text-white/70">
            {error instanceof Error ? error.message : t('socialGraph.list.error')}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-full border border-solid border-white/20 px-4 py-1.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
          >
            {t('socialGraph.list.retry')}
          </button>
        </div>
      );
    }
    if (items.length === 0 && !hasNextPage) {
      return (
        <div className="flex flex-col items-center gap-2 py-12 text-center text-white/60">
          {hasSearch
            ? <SearchX aria-hidden className="h-[30px] w-[30px] text-white/35" />
            : <Inbox aria-hidden className="h-[30px] w-[30px] text-white/35" />}
          <p className="text-sm">
            {hasSearch
              ? t('socialGraph.list.emptySearch')
              : t(`socialGraph.list.empty.${tab}`)}
          </p>
        </div>
      );
    }
    return (
      <div className="flex flex-col">
        {items.map((account) => (
          <ConnectionRow
            key={account.address}
            account={account}
            onNavigate={() => onClose?.()}
          />
        ))}
        {hasNextPage && (
          <button
            type="button"
            ref={sentinelRef}
            disabled={isFetchingNextPage}
            onClick={() => fetchNextPage()}
            className="my-3 rounded-full border border-white/20 px-4 py-2 text-sm"
          >
            {t('socialGraph.list.loadMore', { defaultValue: 'Load more' })}
          </button>
        )}
        {isFetchingNextPage && (
          <div className="flex justify-center py-4"><Spinner /></div>
        )}
      </div>
    );
  }, [
    isLoading, isError, error, items, hasSearch, tab, t, refetch, onClose, isFetchingNextPage, hasNextPage, fetchNextPage,
  ]);

  return (
    <div className="flex flex-col gap-3" data-testid="follow-connections-modal">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-full bg-white/5 p-1" role="tablist">
          {TABS.map((direction) => {
            const count = direction === 'followers' ? followersCount : followingCount;
            return (
              <button
                key={direction}
                type="button"
                role="tab"
                aria-selected={tab === direction}
                onClick={() => setTab(direction)}
                data-testid={`connections-tab-${direction}`}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  tab === direction ? 'bg-white/15 text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                {t(`socialGraph.list.tab.${direction}`)}
                {typeof count === 'number' && (
                  <span className="tabular-nums text-white/55">{count.toLocaleString()}</span>
                )}
              </button>
            );
          })}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t('socialGraph.list.close')}
            className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={t('socialGraph.list.searchPlaceholder')}
          aria-label={t('socialGraph.list.searchPlaceholder')}
          data-testid="connections-search"
          className="pl-9 bg-white/5 border-white/10 text-white"
        />
      </div>

      <div className="max-h-[min(60vh,420px)] overflow-y-auto -mx-1 px-1">
        {body}
      </div>
    </div>
  );
};

export default FollowConnectionsModal;
