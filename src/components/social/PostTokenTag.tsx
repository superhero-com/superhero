import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { TokensService } from '@/api/generated';
import type { TokenDto } from '@/api/generated/models/TokenDto';
import { toTokenLookupParam } from '@/utils/address';
import { cn } from '@/lib/utils';
import PriceDataFormatter from '@/features/shared/components/PriceDataFormatter';
import TokenChange from '@/components/Trendminer/TokenChange';
import { TokenLineChart } from '@/features/trending/components/TokenLineChart';
import type { TokenTagDisplayOptions } from '@/utils/tokenTagEnvelope';

interface PostTokenTagProps {
  symbol: string;
  options: TokenTagDisplayOptions;
  variant?: 'pill' | 'inline';
}

/**
 * Renders a `#SYMBOL{...}` token tag with the display options its envelope resolved to.
 * The symbol link always renders; price, 24h change and chart are added only when asked
 * for and only once the token resolves, so an unknown or still-loading token degrades to
 * the plain tag — the envelope itself is never shown as text.
 */
const PostTokenTag = ({ symbol, options, variant = 'inline' }: PostTokenTagProps) => {
  const normalized = symbol.replace(/^#/, '');
  const target = `/trends/tokens/${encodeURIComponent(normalized.toUpperCase())}?showTrade=0`;

  const { data: token } = useQuery<TokenDto | null>({
    queryKey: ['post-token-tag', normalized.toUpperCase()],
    queryFn: () => TokensService.findByAddress({ address: toTokenLookupParam(normalized) }),
    staleTime: 60 * 1000,
    enabled: Boolean(normalized),
    retry: false,
  });

  const showChart = options.chart && Boolean(token?.sale_address);
  const showPrice = options.price && Boolean(token?.price_data);
  const showChange = options.change && Boolean(token?.performance);

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 align-baseline">
      <Link
        to={target}
        className={cn(
          variant === 'pill'
            ? 'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-[var(--neon-blue)] text-[12px] font-semibold hover:bg-white/15 hover:border-white/25'
            : 'inline-flex items-baseline gap-1 text-[var(--neon-blue)] underline-offset-2 hover:underline text-[13px] font-medium',
          'no-underline outline-none focus:outline-none break-words',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="leading-none">{`#${normalized}`}</span>
      </Link>
      {showPrice && token && (
        <span className="text-[12px] font-semibold tabular-nums leading-none">
          <PriceDataFormatter priceData={token.price_data} watchPrice hideFiatPrice />
        </span>
      )}
      {showChange && token && <TokenChange token={token} hideNewBadge />}
      {showChart && token && (
        <TokenLineChart saleAddress={token.sale_address} height={28} width={96} interval="all-time" />
      )}
    </span>
  );
};

export default PostTokenTag;
