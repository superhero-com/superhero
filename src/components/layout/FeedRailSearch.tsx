import AddressAvatar from '@/components/AddressAvatar';
import Spinner from '@/components/Spinner';
import { Input } from '@/components/ui/input';
import type { TFunction } from 'i18next';
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
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, type NavigateFunction } from 'react-router-dom';
import { formatAddress } from '@/utils/address';
import './RailCards.css';
import './FeedRailSearch.css';

const FEED_RAIL_DROPDOWN_PANEL_CLASS = 'feed-rail-search__panel';

function feedNavTrendToken(navigate: NavigateFunction, nameOrAddress: string) {
  navigate(`/trends/tokens/${encodeURIComponent(nameOrAddress)}`);
}

function feedNavUser(navigate: NavigateFunction, address: string) {
  navigate(`/users/${address}`);
}

function feedNavPost(navigate: NavigateFunction, slugOrId: string) {
  navigate(`/post/${encodeURIComponent(slugOrId)}`);
}

function feedNavExploreWithQuery(navigate: NavigateFunction, q: string) {
  navigate(`/trends/tokens?${EXPLORE_SEARCH_QUERY_KEY}=${encodeURIComponent(q)}`);
}

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

function postPreview(
  content: string | undefined,
  emptyLabel: string,
  maxLen = 200,
): string {
  const raw = (content || '').replace(/\s+/g, ' ').trim();
  if (!raw) return emptyLabel;
  return raw.length > maxLen ? `${raw.slice(0, maxLen)}…` : raw;
}

function recentRemoveAriaLabel(
  entry: FeedRailRecentEntry,
  t: TFunction<'common'>,
): string {
  switch (entry.kind) {
    case 'query':
      return t('feedRailSearch.aria.removeRecentQuery', { query: entry.query });
    case 'token':
      return t('feedRailSearch.aria.removeRecentToken');
    case 'user':
      return t('feedRailSearch.aria.removeRecentUser');
    case 'post':
      return t('feedRailSearch.aria.removeRecentPost');
    default:
      return t('feedRailSearch.aria.removeRecentDefault');
  }
}

const FeedRailRecentRow = ({
  entry,
  onActivate,
  onRemoveClick,
}: {
  entry: FeedRailRecentEntry;
  onActivate: () => void;
  onRemoveClick: (e: ReactMouseEvent) => void;
}) => {
  const { t } = useTranslation('common');
  let main: ReactNode;
  switch (entry.kind) {
    case 'query':
      main = (
        <>
          <SearchIcon className="w-4 h-4 feed-search-accent flex-shrink-0 mt-0.5" aria-hidden />
          <div className="min-w-0 flex-1 text-start">
            <div className="text-[13px] font-semibold feed-search-text truncate">
              {entry.query}
            </div>
            <div className="text-[11px] feed-search-muted mt-0.5">
              {t('feedRailSearch.searchOnExplore')}
            </div>
          </div>
        </>
      );
      break;
    case 'token': {
      const addr = entry.address ? formatAddress(entry.address, 12, false) : '—';
      main = (
        <div className="min-w-0 flex-1 text-start w-full">
          <div className="text-[11px] font-medium feed-search-accent mb-1">
            {t('feedRailSearch.trend')}
          </div>
          <div className="text-[15px] font-semibold feed-search-text leading-tight">
            {trendHashtag({ symbol: entry.symbol, name: entry.name })}
          </div>
          <div className="text-[11px] feed-search-muted font-mono tracking-tight mt-0.5 truncate">
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
          <div className="min-w-0 flex-1 text-start">
            <div className="text-[11px] font-medium feed-search-accent mb-1">
              {t('feedRailSearch.people')}
            </div>
            <div className="text-[15px] font-semibold feed-search-text truncate leading-tight">
              {title}
            </div>
            <div className="text-[11px] feed-search-muted font-mono truncate mt-0.5">
              {formatAddress(entry.address, 14, false)}
            </div>
          </div>
        </>
      );
      break;
    }
    case 'post':
      main = (
        <div className="min-w-0 flex-1 text-start w-full">
          <div className="text-[11px] font-medium feed-search-accent mb-1">
            {t('feedRailSearch.post')}
          </div>
          <p className="text-[13px] feed-search-text leading-snug line-clamp-4 m-0">
            {entry.preview}
          </p>
        </div>
      );
      break;
    default:
      main = null;
  }

  const rowFlex = entry.kind === 'user'
    ? 'flex flex-1 min-w-0 items-start gap-2.5 px-3 py-2.5 text-start bg-transparent border-none cursor-pointer feed-search-text w-full'
    : 'flex flex-1 min-w-0 items-center gap-2.5 px-3 py-2.5 text-start bg-transparent border-none cursor-pointer feed-search-text w-full';

  return (
    <div
      className="flex items-stretch border-b feed-search-divider last:border-b-0 feed-search-hover transition-colors"
    >
      <button type="button" className={rowFlex} onClick={onActivate}>
        {main}
      </button>
      <button
        type="button"
        className="feed-rail-search__remove flex items-center justify-center w-10 shrink-0 feed-search-muted feed-search-text-hover feed-search-hover border-none bg-transparent cursor-pointer"
        aria-label={recentRemoveAriaLabel(entry, t)}
        onClick={onRemoveClick}
      >
        <X className="w-4 h-4" aria-hidden />
      </button>
    </div>
  );
};

const FeedRailSearch = () => {
  const { t } = useTranslation('common');
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

  useEffect(() => {
    const live = (debounced || trimmedInput).trim();
    if (live) lastPickSearchRef.current = live;
  }, [debounced, trimmedInput]);

  const {
    data: items = [],
    isFetching,
    isError,
    isPlaceholderData,
  } = useQuery({
    queryKey: ['feed-rail-search', debounced],
    queryFn: () => fetchFeedRailSearchItems(debounced),
    enabled: hasQuery,
    staleTime: 30 * 1000,
    retry: 1,
    placeholderData: (prev) => prev,
  });

  /**
   * `placeholderData` + `enabled: hasQuery` can surface the last fetch while debounce
   * catches up (or the field is cleared); never treat that as live hits.
   */
  const hitsAreForActiveQuery = hasQuery && !isPlaceholderData;

  useEffect(() => {
    const onDoc = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onDoc);
    return () => document.removeEventListener('pointerdown', onDoc);
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
    const term = (debounced || searchInput.trim()).trim();
    if (term) lastPickSearchRef.current = term;
  }, [debounced, searchInput]);

  const go = useCallback(
    (row: FeedRailSearchItem) => {
      const term = (debounced || searchInput.trim()).trim() || lastPickSearchRef.current;
      switch (row.type) {
        case 'token': {
          const { address, name, symbol } = row.item;
          pushRecent({
            kind: 'token',
            id: `t-${address}`,
            query: term,
            address,
            name: name ?? '',
            symbol: symbol ?? '',
          });
          feedNavTrendToken(navigate, name || address);
          break;
        }
        case 'user': {
          const user = row.item;
          pushRecent({
            kind: 'user',
            id: `u-${user.address}`,
            query: term,
            address: user.address,
            chain_name: user.chain_name ?? null,
          });
          feedNavUser(navigate, user.address);
          break;
        }
        case 'post': {
          const post = row.item;
          pushRecent({
            kind: 'post',
            id: `p-${post.id}`,
            query: term,
            postId: post.id,
            slug: post.slug ?? null,
            preview: postPreview(
              post.content,
              t('feedRailSearch.postPreviewFallback'),
            ),
          });
          feedNavPost(navigate, (post.slug || post.id) as string);
          break;
        }
        default:
          break;
      }
      clearSearchUi();
    },
    [navigate, clearSearchUi, debounced, searchInput, pushRecent, t],
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
        feedNavTrendToken(navigate, entry.name || entry.address);
      } else if (entry.kind === 'user') {
        feedNavUser(navigate, entry.address);
      } else {
        feedNavPost(navigate, (entry.slug || entry.postId) as string);
      }
      clearSearchUi();
    },
    [pushRecent, navigate, clearSearchUi],
  );

  /** Same as choosing the Explore row: full Explore search with `q`, plus recent query. */
  const submitSearchToExplore = useCallback(() => {
    const q = activeSearchLabel.trim();
    if (q) {
      pushRecent({ kind: 'query', id: `q-${q.toLowerCase()}`, query: q });
      feedNavExploreWithQuery(navigate, q);
    }
    clearSearchUi();
  }, [activeSearchLabel, pushRecent, navigate, clearSearchUi]);

  const onSearchKeyDown = useCallback(
    (e: ReactKeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      submitSearchToExplore();
    },
    [submitSearchToExplore],
  );

  return (
    <div ref={rootRef} className="feed-rail-search">
      <div className="feed-rail-search__field">
        <span className="feed-rail-search__icon" aria-hidden="true"><SearchIcon /></span>
        <Input
          type="search"
          aria-label={t('feedRailSearch.inputAria')}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={onSearchKeyDown}
          onFocus={() => setOpen(true)}
          placeholder={t('feedRailSearch.inputPlaceholder')}
          className="feed-rail-search__input focus-visible:ring-0"
          autoComplete="off"
        />
      </div>

      {showRecentsPanel ? (
        <div
          className={FEED_RAIL_DROPDOWN_PANEL_CLASS}
          role="region"
          aria-label={t('feedRailSearch.recentRegionAria')}
        >
          {recentItems.length > 0 ? (
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-b feed-search-divider">
              <span className="text-[15px] font-bold feed-search-text">{t('feedRailSearch.recent')}</span>
              <button
                type="button"
                className="feed-rail-search__clear text-[13px] font-semibold text-[#1161FE] hover:text-[#3d7efe] bg-transparent border-none p-0 cursor-pointer shrink-0"
                onClick={() => clearAll()}
              >
                {t('feedRailSearch.clearAll')}
              </button>
            </div>
          ) : null}
          {recentItems.length === 0 ? (
            <div className="px-3 py-6 text-[13px] feed-search-muted text-center leading-snug">
              {t('feedRailSearch.recentsEmpty')}
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
        <div className={FEED_RAIL_DROPDOWN_PANEL_CLASS}>
          <Link
            to={
              activeSearchLabel.trim()
                ? `/trends/tokens?${EXPLORE_SEARCH_QUERY_KEY}=${encodeURIComponent(activeSearchLabel.trim())}`
                : '/trends/tokens'
            }
            onClick={(e) => {
              if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
              e.preventDefault();
              submitSearchToExplore();
            }}
            className="flex items-center gap-2.5 px-3 py-2.5 border-b feed-search-divider feed-search-hover transition-colors text-start no-underline w-full box-border"
            aria-label={t('feedRailSearch.exploreSearchAria', { query: activeSearchLabel })}
          >
            <SearchIcon className="w-4 h-4 feed-search-accent flex-shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold feed-search-text truncate">
                {activeSearchLabel}
              </div>
              <div className="text-[11px] feed-search-muted mt-0.5">
                {t('feedRailSearch.searchOnExplore')}
              </div>
            </div>
          </Link>

          {hasQuery && isFetching ? (
            <div className="flex items-center justify-center gap-2 py-6 text-xs feed-search-muted">
              <Spinner className="w-4 h-4" />
              <span>{t('feedRailSearch.searching')}</span>
            </div>
          ) : null}

          {hasQuery && !isFetching && isError ? (
            <div className="px-3 py-4 text-xs feed-search-muted text-center">
              {t('feedRailSearch.searchFailed')}
            </div>
          ) : null}

          {hitsAreForActiveQuery && !isFetching && !isError && items.length === 0 ? (
            <div className="px-3 py-4 text-xs feed-search-muted text-center">
              {t('feedRailSearch.noResults')}
            </div>
          ) : null}

          {hitsAreForActiveQuery && !isFetching && !isError && items.length > 0
            ? items.map((row, index) => {
              if (row.type === 'token') {
                const token = row.item;
                const addr = token.address ? formatAddress(token.address, 12, false) : '—';
                return (
                  <button
                    key={feedRailRowKey(row, index)}
                    type="button"
                    className="w-full text-start px-3 py-2.5 border-b feed-search-divider last:border-b-0 feed-search-hover transition-colors"
                    onPointerDownCapture={capturePickSearchTerm}
                    onClick={() => go(row)}
                  >
                    <div className="text-[11px] font-medium feed-search-accent mb-1">
                      {t('feedRailSearch.trend')}
                    </div>
                    <div className="text-[15px] font-semibold feed-search-text leading-tight">
                      {trendHashtag(token)}
                    </div>
                    <div className="text-[11px] feed-search-muted font-mono tracking-tight mt-0.5 truncate">
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
                    className="w-full flex items-start gap-2.5 px-3 py-2.5 border-b feed-search-divider last:border-b-0 feed-search-hover transition-colors text-start"
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
                      <div className="text-[11px] font-medium feed-search-accent mb-1">
                        {t('feedRailSearch.people')}
                      </div>
                      <div className="text-[15px] font-semibold feed-search-text truncate leading-tight">
                        {title}
                      </div>
                      <div className="text-[11px] feed-search-muted font-mono truncate mt-0.5">
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
                  className="w-full text-start px-3 py-2.5 border-b feed-search-divider last:border-b-0 feed-search-hover transition-colors"
                  onPointerDownCapture={capturePickSearchTerm}
                  onClick={() => go(row)}
                >
                  <div className="text-[11px] font-medium feed-search-accent mb-1">
                    {t('feedRailSearch.post')}
                  </div>
                  <p className="text-[13px] feed-search-text leading-snug line-clamp-4 m-0">
                    {postPreview(p.content, t('feedRailSearch.postPreviewFallback'))}
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
