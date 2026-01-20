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

interface PostHashtagLinkProps {
  tag: string;
  label: string;
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

export default function PostHashtagLink({ tag, label }: PostHashtagLinkProps) {
  const normalized = normalizeTag(tag);
  const target = `/trends/tokens/${encodeURIComponent(normalized.toUpperCase())}?showTrade=0`;

  const { data: token } = useQuery({
    queryKey: ["post-hashtag-token", normalized],
    queryFn: () => fetchTokenForTag(normalized),
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(normalized),
  });

  const tokenAddress = (token as TokenLike | null)?.address || (token as TokenLike | null)?.sale_address;
  const { data: performance } = useQuery({
    queryKey: ["post-hashtag-performance", tokenAddress],
    queryFn: () => SuperheroApi.getTokenPerformance(String(tokenAddress)),
    staleTime: 60 * 1000,
    enabled: Boolean(tokenAddress),
  });

  // TODO: We should use 24h performance, but it is not present for most of the tokens.
  const changeRaw = (performance as any)?.past_7d?.current_change_percent;
  const changePercent = typeof changeRaw === "number" ? changeRaw : 0;
  const hasChange = Boolean(tokenAddress);
  const isPositive = changePercent >= 0;
  const changeText = hasChange ? `${Math.abs(changePercent).toFixed(2)}%` : null;

  return (
    <Link
      to={target}
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full",
        "bg-white/10 border border-white/15 text-white/90 text-[12px] font-semibold",
        "hover:bg-white/15 hover:border-white/25 no-underline",
        "outline-none focus:outline-none focus-visible:outline-none focus-visible:ring-0",
        "break-words"
      )}
      style={{ outline: "none" }}
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
