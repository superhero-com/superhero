import AddressAvatar from '@/components/AddressAvatar';
import Spinner from '@/components/Spinner';
import { Input } from '@/components/ui/input';
import {
  EXPLORE_SEARCH_QUERY_KEY,
  FEED_RAIL_SEARCH_DEBOUNCE_MS,
  fetchFeedRailSearchItems,
  type FeedRailSearchItem,
} from '@/features/trending/api/trendsSearch';
import { useDebouncedTrimmedSearch } from '@/hooks/useDebouncedValue';
import {
  useFeedRailRecentSearches,
  type FeedRailRecentEntry,
} from '@/hooks/useFeedRailRecentSearches';
import { useQuery } from '@tanstack/react-query';
import {
  Search as SearchIcon,
  X,
} from 'lucide-react';
import {
  useCallback, useEffect, useRef, useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatAddress } from '@/utils/address';

function feedRailRowKey(row: FeedRailSearchItem, index: number): string {
  if (row.type === 'token') return `t-${row.item.address}-${index}`;
  if (row.type === 'user') return `u-${row.item.address}-${index}`;
  return `p-${row.item.id}-${row.item.slug ?? ''}-${index}`;
}

/** Hashtag-style trend label: prefer symbol, then name (no leading # in source — we add it). */
function trendHashtag(token: { symbol?: string | null; name?: string | null }): string {
  const raw = (token.symbol || token.name || '').trim();
  const cleaned = raw.replace(/^#+/, '');
  return cleaned ? `#${cleaned}` : '#—';
}

function postPreview(content: string | undefined, maxLen = 200): string {
  const raw = (content || '').replace(/\s+/g, ' ').trim();
  if (!raw) return 'Post';
  return raw.length > maxLen ? `${raw.slice(0, maxLen)}…` : raw;
}

function recentRemoveAriaLabel(entry: FeedRailRecentEntry): string {
  switch (entry.kind) {
    case 'query':
      return `Remove recent search "${entry.query}"`;
    case 'token':
      return 'Remove this trend from recent searches';
    case 'user':
      return 'Remove this profile from recent searches';
    case 'post':
      return 'Remove this post from recent searches';
    default:
      return 'Remove from recent searches';
  }
}

const FeedRailRecentRow = ({
  entry,
  onActivate,
  onRemoveClick,
}: {
  entry: FeedRailRecentEntry;
  onActivate: () => void;
  onRemoveClick: (e: MouseEvent) => void;
}) => {
  let main: ReactNode;
  switch (entry.kind) {
    case 'query':
      main = (
        <>
          <SearchIcon className="w-4 h-4 text-[#8bc9ff] flex-shrink-0 mt-0.5" aria-hidden />
          <div className="min-w-0 flex-1 text-left">
            <div className="text-[13px] font-semibold text-white truncate">
              {entry.query}
            </div>
            <div className="text-[10px] text-white/45 mt-0.5">
              Search on Explore
            </div>
          </div>
        </>
      );
      break;
    case 'token': {
      const addr = entry.address ? formatAddress(entry.address, 12, false) : '—';
      main = (
        <div className="min-w-0 flex-1 text-left w-full">
          <div className="text-[11px] font-medium text-[#8bc9ff]/90 mb-1">
            Trend
          </div>
          <div className="text-[15px] font-semibold text-white leading-tight">
            {trendHashtag({ symbol: entry.symbol, name: entry.name })}
          </div>
          <div className="text-[11px] text-white/45 font-mono tracking-tight mt-0.5 truncate">
            {addr}
          </div>
        </div>
      );
      break;
    }
    case 'user': {
      const title = entry.chain_name || formatAddress(entry.address, 6);
      main = (
        <>
          <AddressAvatar
            address={entry.address}
            size={36}
            borderRadius="50%"
            className="flex-shrink-0 mt-0.5"
          />
          <div className="min-w-0 flex-1 text-left">
            <div className="text-[11px] font-medium text-[#8bc9ff]/90 mb-1">
              People
            </div>
            <div className="text-[15px] font-semibold text-white truncate leading-tight">
              {title}
            </div>
            <div className="text-[11px] text-white/45 font-mono truncate mt-0.5">
              {formatAddress(entry.address, 14, false)}
            </div>
          </div>
        </>
      );
      break;
    }
    case 'post':
      main = (
        <div className="min-w-0 flex-1 text-left w-full">
          <div className="text-[11px] font-medium text-[#8bc9ff]/90 mb-1">
            Post
          </div>
          <p className="text-[13px] text-white/90 leading-snug line-clamp-4 m-0">
            {entry.preview}
          </p>
        </div>
      );
      break;
    default:
      main = null;
  }

  const rowFlex = entry.kind === 'user'
    ? 'flex flex-1 min-w-0 items-start gap-2.5 px-3 py-2.5 text-left bg-transparent border-none cursor-pointer text-white w-full'
    : 'flex flex-1 min-w-0 items-center gap-2.5 px-3 py-2.5 text-left bg-transparent border-none cursor-pointer text-white w-full';

  return (
    <div
      className="flex items-stretch border-b border-white/5 last:border-b-0 hover:bg-white/[0.06] transition-colors"
    >
      <button type="button" className={rowFlex} onClick={onActivate}>
        {main}
      </button>
      <button
        type="button"
        className="flex items-center justify-center w-10 shrink-0 text-white/45 hover:text-white hover:bg-white/[0.08] border-none bg-transparent cursor-pointer"
        aria-label={recentRemoveAriaLabel(entry)}
        onClick={onRemoveClick}
      >
        <X className="w-4 h-4" aria-hidden />
      </button>
    </div>
  );
};

const FeedRailSearch = () => {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const debounced = useDebouncedTrimmedSearch(searchInput, FEED_RAIL_SEARCH_DEBOUNCE_MS);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  /** Last non-empty search text (survives races where the field clears before `go` runs). */
  const lastPickSearchRef = useRef('');
  const {
    items: recentItems,
    pushRecent,
    removeRecent,
    clearAll,
  } = useFeedRailRecentSearches();

  const trimmedInput = searchInput.trim();
  const hasQuery = debounced.length > 0;
  /** Query shown in the Explore row while debounce is catching up. */
  const activeSearchLabel = debounced || trimmedInput;
  const showRecentsPanel = open && trimmedInput.length === 0;
  const showSearchPanel = open && trimmedInput.length > 0;

  const livePickTerm = (debounced || trimmedInput).trim();
  if (livePickTerm) lastPickSearchRef.current = livePickTerm;

  const { data: items = [], isFetching, isError } = useQuery({
    queryKey: ['feed-rail-search', debounced],
    queryFn: () => fetchFeedRailSearchItems(debounced),
    enabled: hasQuery,
    staleTime: 30 * 1000,
    retry: 1,
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const clearSearchUi = useCallback(() => {
    setOpen(false);
    setSearchInput('');
  }, []);

  /** Capture phase so we still see the query before browser `type="search"` clear or blur races. */
  const capturePickSearchTerm = useCallback(() => {
    const t = (debounced || searchInput.trim()).trim();
    if (t) lastPickSearchRef.current = t;
  }, [debounced, searchInput]);

  const go = useCallback(
    (row: FeedRailSearchItem) => {
      const term = (debounced || searchInput.trim()).trim() || lastPickSearchRef.current;
      if (row.type === 'token') {
        const t = row.item;
        pushRecent({
          kind: 'token',
          id: `t-${t.address}`,
          query: term,
          address: t.address,
          name: t.name ?? '',
          symbol: t.symbol ?? '',
        });
      } else if (row.type === 'user') {
        const u = row.item;
        pushRecent({
          kind: 'user',
          id: `u-${u.address}`,
          query: term,
          address: u.address,
          chain_name: u.chain_name ?? null,
        });
      } else {
        const p = row.item;
        pushRecent({
          kind: 'post',
          id: `p-${p.id}`,
          query: term,
          postId: p.id,
          slug: p.slug ?? null,
          preview: postPreview(p.content),
        });
      }
      if (row.type === 'token') {
        const { name, address } = row.item;
        navigate(`/trends/tokens/${encodeURIComponent(name || address)}`);
      } else if (row.type === 'user') {
        navigate(`/users/${row.item.address}`);
      } else {
        const p = row.item;
        const slugOrId = (p.slug || p.id) as string;
        navigate(`/post/${encodeURIComponent(slugOrId)}`);
      }
      clearSearchUi();
    },
    [navigate, clearSearchUi, debounced, searchInput, pushRecent],
  );

  const onPickRecent = useCallback(
    (entry: FeedRailRecentEntry) => {
      pushRecent(entry);
      if (entry.kind === 'query') {
        setSearchInput(entry.query);
        setOpen(true);
        return;
      }
      if (entry.kind === 'token') {
        navigate(`/trends/tokens/${encodeURIComponent(entry.name || entry.address)}`);
      } else if (entry.kind === 'user') {
        navigate(`/users/${entry.address}`);
      } else {
        const slugOrId = (entry.slug || entry.postId) as string;
        navigate(`/post/${encodeURIComponent(slugOrId)}`);
      }
      clearSearchUi();
    },
    [pushRecent, navigate, clearSearchUi],
  );

  return (
    <div ref={rootRef} className="relative w-full overflow-visible">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/45 pointer-events-none" />
        <Input
          type="search"
          aria-label="Search trends, users and posts"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search trends, users or posts"
          className="h-9 rounded-xl border-white/10 bg-white/[0.04] pl-9 pr-2.5 text-xs text-white placeholder:text-white/40 focus-visible:ring-[#1161FE]"
          autoComplete="off"
        />
      </div>

      {showRecentsPanel ? (
        <div
          className="absolute z-[60] left-0 right-0 mt-2 rounded-xl border border-white/10 bg-[#0f1118] shadow-lg max-h-[min(70vh,33rem)] overflow-y-auto overflow-x-hidden"
          role="region"
          aria-label="Recent searches"
        >
          {recentItems.length > 0 ? (
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/10">
              <span className="text-[15px] font-bold text-white">Recent</span>
              <button
                type="button"
                className="text-[13px] font-semibold text-[#1161FE] hover:text-[#3d7efe] bg-transparent border-none p-0 cursor-pointer shrink-0"
                onClick={() => clearAll()}
              >
                Clear all
              </button>
            </div>
          ) : null}
          {recentItems.length === 0 ? (
            <div className="px-3 py-6 text-[13px] text-white/50 text-center leading-snug">
              Try searching for trends, people, posts
            </div>
          ) : (
            recentItems.map((entry) => (
              <FeedRailRecentRow
                key={entry.id}
                entry={entry}
                onActivate={() => onPickRecent(entry)}
                onRemoveClick={(e) => {
                  e.stopPropagation();
                  removeRecent(entry.id);
                }}
              />
            ))
          )}
        </div>
      ) : null}

      {showSearchPanel ? (
        <div
          className="absolute z-[60] left-0 right-0 mt-2 rounded-xl border border-white/10 bg-[#0f1118] shadow-lg max-h-[min(70vh,33rem)] overflow-y-auto overflow-x-hidden"
        >
          <Link
            to={`/trends/tokens?${EXPLORE_SEARCH_QUERY_KEY}=${encodeURIComponent(activeSearchLabel)}`}
            onClick={() => {
              const q = activeSearchLabel.trim();
              if (q) {
                pushRecent({ kind: 'query', id: `q-${q.toLowerCase()}`, query: q });
              }
              clearSearchUi();
            }}
            className="flex items-center gap-2.5 px-3 py-2.5 border-b border-white/10 hover:bg-white/[0.06] transition-colors text-left no-underline w-full box-border"
            aria-label={`Search "${activeSearchLabel}" on Explore`}
          >
            <SearchIcon className="w-4 h-4 text-[#8bc9ff] flex-shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-white truncate">
                {activeSearchLabel}
              </div>
              <div className="text-[10px] text-white/45 mt-0.5">
                Search on Explore
              </div>
            </div>
          </Link>

          {isFetching ? (
            <div className="flex items-center justify-center gap-2 py-6 text-xs text-white/60">
              <Spinner className="w-4 h-4" />
              <span>Searching…</span>
            </div>
          ) : null}

          {!isFetching && isError ? (
            <div className="px-3 py-4 text-xs text-white/60 text-center">
              Search failed. Try again.
            </div>
          ) : null}

          {!isFetching && !isError && items.length === 0 ? (
            <div className="px-3 py-4 text-xs text-white/60 text-center">
              No results
            </div>
          ) : null}

          {!isFetching && !isError && items.length > 0
            ? items.map((row, index) => {
              if (row.type === 'token') {
                const t = row.item;
                const addr = t.address ? formatAddress(t.address, 12, false) : '—';
                return (
                  <button
                    key={feedRailRowKey(row, index)}
                    type="button"
                    className="w-full text-left px-3 py-2.5 border-b border-white/5 last:border-b-0 hover:bg-white/[0.06] transition-colors"
                    onPointerDownCapture={capturePickSearchTerm}
                    onClick={() => go(row)}
                  >
                    <div className="text-[11px] font-medium text-[#8bc9ff]/90 mb-1">
                      Trend
                    </div>
                    <div className="text-[15px] font-semibold text-white leading-tight">
                      {trendHashtag(t)}
                    </div>
                    <div className="text-[11px] text-white/45 font-mono tracking-tight mt-0.5 truncate">
                      {addr}
                    </div>
                  </button>
                );
              }

              if (row.type === 'user') {
                const u = row.item;
                const title = u.chain_name || formatAddress(u.address, 6);
                return (
                  <button
                    key={feedRailRowKey(row, index)}
                    type="button"
                    className="w-full flex items-start gap-2.5 px-3 py-2.5 border-b border-white/5 last:border-b-0 hover:bg-white/[0.06] transition-colors text-left"
                    onPointerDownCapture={capturePickSearchTerm}
                    onClick={() => go(row)}
                  >
                    <AddressAvatar
                      address={u.address}
                      size={36}
                      borderRadius="50%"
                      className="flex-shrink-0 mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-medium text-[#8bc9ff]/90 mb-1">
                        People
                      </div>
                      <div className="text-[15px] font-semibold text-white truncate leading-tight">
                        {title}
                      </div>
                      <div className="text-[11px] text-white/45 font-mono truncate mt-0.5">
                        {formatAddress(u.address, 14, false)}
                      </div>
                    </div>
                  </button>
                );
              }

              const p = row.item;
              return (
                <button
                  key={feedRailRowKey(row, index)}
                  type="button"
                  className="w-full text-left px-3 py-2.5 border-b border-white/5 last:border-b-0 hover:bg-white/[0.06] transition-colors"
                  onPointerDownCapture={capturePickSearchTerm}
                  onClick={() => go(row)}
                >
                  <div className="text-[11px] font-medium text-[#8bc9ff]/90 mb-1">
                    Post
                  </div>
                  <p className="text-[13px] text-white/90 leading-snug line-clamp-4 m-0">
                    {postPreview(p.content)}
                  </p>
                </button>
              );
            })
            : null}
        </div>
      ) : null}
    </div>
  );
};

export default FeedRailSearch;
