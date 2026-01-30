import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { SuperheroApi } from "@/api/backend";
import { cn } from "@/lib/utils";

type TokenLike = {
  name?: string;
  symbol?: string;
  address?: string;
  sale_address?: string;
};

type TrendPerformanceWindow = {
  current_change_percent?: number;
};

export type TrendMention = {
  name?: string;
  sale_address?: string;
  address?: string;
  performance?: {
    past_24h?: TrendPerformanceWindow;
    past_7d?: TrendPerformanceWindow;
  };
};

interface PostHashtagLinkProps {
  tag: string;
  label: string;
  trendMentions?: TrendMention[];
  variant?: "pill" | "inline";
}

function normalizeTag(tag: string) {
  return String(tag || "").replace(/^#/, "").toLowerCase();
}

async function fetchTokenForTag(tag: string): Promise<TokenLike | null> {
  const resp = await SuperheroApi.listTokens({ search: tag, limit: 5 });
  const items = Array.isArray(resp?.items) ? resp.items : [];
  const normalized = normalizeTag(tag);
  const match = items.find((token: TokenLike) => {
    const name = String(token?.name || "").toLowerCase();
    const symbol = String(token?.symbol || "").toLowerCase();
    return name === normalized || symbol === normalized;
  });
  return match || items[0] || null;
}

export default function PostHashtagLink({ tag, label, trendMentions, variant = "pill" }: PostHashtagLinkProps) {
  const normalized = normalizeTag(tag);
  const target = `/trends/tokens/${encodeURIComponent(normalized.toUpperCase())}?showTrade=0`;

  const matchedMention = Array.isArray(trendMentions)
    ? trendMentions.find((mention) => {
        const name = normalizeTag(mention?.name || "");
        return name === normalized;
      })
    : undefined;
  const hasMentionAddress = Boolean(matchedMention?.sale_address || matchedMention?.address);

  const { data: token } = useQuery({
    queryKey: ["post-hashtag-token", normalized],
    queryFn: () => fetchTokenForTag(normalized),
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(normalized) && (!matchedMention || !hasMentionAddress),
  });

  const tokenAddress =
    matchedMention?.sale_address ||
    matchedMention?.address ||
    (token as TokenLike | null)?.address ||
    (token as TokenLike | null)?.sale_address;
  const { data: performance } = useQuery({
    queryKey: ["post-hashtag-performance", tokenAddress],
    queryFn: () => SuperheroApi.getTokenPerformance(String(tokenAddress)),
    staleTime: 60 * 1000,
    enabled: Boolean(tokenAddress) && !matchedMention?.performance,
  });

  // TODO: We should use 24h performance, but it is not present for most of the tokens.
  const performanceData = matchedMention?.performance || (performance as any);
  const changeRaw = (performanceData as any)?.past_7d?.current_change_percent;
  const hasChange = (typeof changeRaw === "number" && changeRaw !== 0);
  const changePercent = hasChange ? changeRaw : 0;
  const isPositive = changePercent >= 0;
  const changeText = hasChange ? `${Math.abs(changePercent).toFixed(2)}%` : null;

  return (
    <Link
      to={target}
      className={cn(
        variant === "pill"
          ? "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-[var(--neon-blue)] text-[12px] font-semibold hover:bg-white/15 hover:border-white/25"
          : "inline-flex items-baseline gap-1 text-[var(--neon-blue)] underline-offset-2 hover:underline text-[13px] font-medium",
        "no-underline outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 break-words"
      )}
      style={{
        outline: "none",
        background: "none",
        WebkitTextFillColor: "currentColor",
        WebkitBackgroundClip: "initial",
        backgroundClip: "initial",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="leading-none">{label}</span>
      {changeText && (
        <span
          className={cn(
            "inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums leading-none",
            isPositive ? "text-emerald-400" : "text-rose-400"
          )}
        >
          <span className="text-[10px] leading-none">{isPositive ? "▲" : "▼"}</span>
          <span>{changeText}</span>
        </span>
      )}
    </Link>
  );
}
