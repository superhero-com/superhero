import { SuperheroApi } from '@/api/backend';
import { cn } from '@/lib/utils';
import { DEFAULT_PAST_TIMEFRAME } from '@/utils/constants';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import EntityPill from './EntityPill';
import { PillChangeBadge } from './pillParts';

const MAX_SYMBOL_CHARS = 12;

type TokenLike = {
  name?: string;
  symbol?: string;
  address?: string;
  sale_address?: string;
};

type TrendPerformanceWindow = {
  current_change_percent?: number | string;
};

export type TrendMention = {
  name?: string;
  symbol?: string;
  sale_address?: string;
  address?: string;
  performance?: {
    current_change_percent?: number | string;
    past_24h?: TrendPerformanceWindow;
    past_7d?: TrendPerformanceWindow;
    past_30d?: TrendPerformanceWindow;
    all_time?: TrendPerformanceWindow;
  };
};

interface PostHashtagLinkProps {
  tag: string;
  label: string;
  trendMentions?: TrendMention[];
  // 'pill' / 'inline' are today's baseline renderings (trade activity, etc.). 'post-pill' is
  // the redesigned display pill inside post cards — same resolution, pill chrome, leading mark.
  variant?: 'pill' | 'inline' | 'post-pill';
  // Whether to show the 24h change badge. Defaults to true so every existing call site — and
  // a bare `#SYMBOL` — renders exactly as today; a token tag written `{change=0}` passes false.
  showChange?: boolean;
}

function normalizeTag(tag: string) {
  return String(tag || '').replace(/^#/, '').toLowerCase();
}

async function fetchTokenForTag(tag: string): Promise<TokenLike | null> {
  const resp = await SuperheroApi.listTokens({ search: tag, limit: 5 });
  const items = Array.isArray(resp?.items) ? resp.items : [];
  const normalized = normalizeTag(tag);
  const match = items.find((token: TokenLike) => {
    const name = String(token?.name || '').toLowerCase();
    const symbol = String(token?.symbol || '').toLowerCase();
    return name === normalized || symbol === normalized;
  });
  return match || items[0] || null;
}

function resolveChangePercent(performanceData: any): number | null {
  return performanceData?.[DEFAULT_PAST_TIMEFRAME]?.current_change_percent ?? null;
}

const PostHashtagLink = ({
  tag,
  label,
  trendMentions,
  variant = 'pill',
  showChange = true,
}: PostHashtagLinkProps) => {
  const normalized = normalizeTag(tag);
  const target = `/trends/tokens/${encodeURIComponent(normalized.toUpperCase())}?showTrade=0`;

  const matchedMention = Array.isArray(trendMentions)
    ? trendMentions.find((mention) => {
      const name = normalizeTag(mention?.name || '');
      const symbol = normalizeTag(mention?.symbol || '');
      return name === normalized || symbol === normalized;
    })
    : undefined;
  const hasMentionAddress = Boolean(matchedMention?.sale_address || matchedMention?.address);

  const { data: token } = useQuery({
    queryKey: ['post-hashtag-token', normalized],
    queryFn: () => fetchTokenForTag(normalized),
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(normalized) && (!matchedMention || !hasMentionAddress),
  });

  const tokenAddress = matchedMention?.sale_address
    || matchedMention?.address
    || (token as TokenLike | null)?.address
    || (token as TokenLike | null)?.sale_address;
  const { data: performance } = useQuery({
    queryKey: ['post-hashtag-performance', tokenAddress],
    queryFn: () => SuperheroApi.getTokenPerformance(String(tokenAddress)),
    staleTime: 60 * 1000,
    enabled: showChange && Boolean(tokenAddress) && !matchedMention?.performance,
  });

  const performanceData = matchedMention?.performance || (performance as any);
  const changePercent = resolveChangePercent(performanceData);
  const hasChange = changePercent !== null && changePercent !== 0;
  const isPositive = (changePercent ?? 0) > 0;
  const changeText = hasChange ? `${Math.abs(changePercent ?? 0).toFixed(2)}%` : null;

  // The redesigned post-card pill: a leading mark, the symbol, and the 24h change badge when
  // asked for and available. The token link is always kept — a bare hashtag stays navigable —
  // so this is a rung-0 (`{change=0}`) or rung-1 (default) rendering, never the rich widget.
  if (variant === 'post-pill') {
    const rawSymbol = String(label).replace(/^#/, '');
    const displaySymbol = rawSymbol.length > MAX_SYMBOL_CHARS
      ? `${rawSymbol.slice(0, MAX_SYMBOL_CHARS - 1)}…`
      : rawSymbol;
    const showBadge = showChange && hasChange && changePercent !== null;
    const spokenChange = showBadge
      ? `, ${isPositive ? 'up' : 'down'} ${Math.abs(changePercent ?? 0).toFixed(1)} percent`
      : '';
    return (
      <EntityPill
        sigil="#"
        label={displaySymbol}
        markShape="square"
        to={target}
        ariaLabel={`${rawSymbol}${spokenChange} — link`}
        trailing={showBadge ? <PillChangeBadge changePercent={changePercent ?? 0} /> : undefined}
      />
    );
  }

  return (
    <Link
      to={target}
      className={cn(
        variant === 'pill'
          ? 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-[var(--neon-blue)] text-[12px] font-semibold hover:bg-white/15 hover:border-white/25'
          : 'inline-flex items-baseline gap-1 text-[var(--neon-blue)] underline-offset-2 hover:underline text-[13px] font-medium',
        'no-underline outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 break-words',
      )}
      style={{ outline: 'none' }}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="leading-none">{label}</span>
      {showChange && changeText && (
        <span
          className={cn(
            'inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums leading-none',
            isPositive ? 'text-emerald-400' : 'text-rose-400',
          )}
        >
          <span className="text-[10px] leading-none">{isPositive ? '▲' : '▼'}</span>
          <span>{changeText}</span>
        </span>
      )}
    </Link>
  );
};

export default PostHashtagLink;
