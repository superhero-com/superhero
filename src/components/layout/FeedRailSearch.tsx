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
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon } from 'lucide-react';
import {
  useCallback, useEffect, useRef, useState,
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

const FeedRailSearch = () => {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const debounced = useDebouncedTrimmedSearch(searchInput, FEED_RAIL_SEARCH_DEBOUNCE_MS);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const hasQuery = debounced.length > 0;

  useEffect(() => {
    setOpen(hasQuery);
  }, [hasQuery]);

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

  const go = useCallback(
    (row: FeedRailSearchItem) => {
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
    [navigate, clearSearchUi],
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
          onFocus={() => {
            if (searchInput.trim()) setOpen(true);
          }}
          placeholder="Search trends, users or posts"
          className="h-9 rounded-xl border-white/10 bg-white/[0.04] pl-9 pr-2.5 text-xs text-white placeholder:text-white/40 focus-visible:ring-[#1161FE]"
          autoComplete="off"
        />
      </div>

      {open && hasQuery ? (
        <div
          className="absolute z-[60] left-0 right-0 mt-2 rounded-xl border border-white/10 bg-[#0f1118] shadow-lg max-h-[min(70vh,33rem)] overflow-y-auto overflow-x-hidden"
        >
          <Link
            to={`/trends/tokens?${EXPLORE_SEARCH_QUERY_KEY}=${encodeURIComponent(debounced)}`}
            onClick={clearSearchUi}
            className="flex items-center gap-2.5 px-3 py-2.5 border-b border-white/10 hover:bg-white/[0.06] transition-colors text-left no-underline w-full box-border"
            aria-label={`Search “${debounced}” on Explore`}
          >
            <SearchIcon className="w-4 h-4 text-[#8bc9ff] flex-shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-white truncate">
                {debounced}
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
