import AddressAvatarWithChainNameFeed from "@/@components/Address/AddressAvatarWithChainNameFeed";
import { memo, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { linkify } from "../../../utils/linkify";
import { useWallet } from "../../../hooks";
import type { PostDto } from "../../../api/generated";
import { compactTime } from "../../../utils/time";
// SharePopover removed from activity row per design

interface TokenCreatedActivityItemProps {
  item: PostDto;
  hideMobileDivider?: boolean;
  mobileTight?: boolean; // reduce vertical padding on mobile for middle items in a group
  footer?: React.ReactNode; // optional mobile-only footer area (e.g., Show more) rendered just above divider
}

function useTokenName(item: PostDto): string | null {
  return useMemo(() => {
    const fromId = () => {
      const id = String(item?.id || "");
      if (!id.startsWith("token-created:")) return null;
      const parts = id.replace(/_v3$/, "").split(":");
      const encoded = parts[1];
      if (!encoded) return null;
      try { return decodeURIComponent(encoded); } catch { return encoded; }
    };
    const fromTopics = () => {
      const topics = (item as any)?.topics as string[] | undefined;
      if (!Array.isArray(topics)) return null;
      const hash = topics.find((t) => typeof t === 'string' && t.startsWith('#'));
      if (hash) return hash.replace(/^#/, '');
      const tn = topics.find((t) => typeof t === 'string' && t.startsWith('token_name:'));
      if (tn) return tn.split(':')[1];
      return null;
    };
    return fromId() || fromTopics();
  }, [item]);
}

const TokenCreatedActivityItem = memo(({ item, hideMobileDivider = false, mobileTight = false, footer }: TokenCreatedActivityItemProps) => {
  const navigate = useNavigate();
  const { chainNames } = useWallet();
  const creator = item.sender_address;
  const displayName = chainNames?.[creator] || "Legend";
  const tokenName = useTokenName(item);
  const tokenLink = tokenName ? `/trends/tokens/${tokenName}` : undefined;

  const onOpen = useCallback(() => {
    if (tokenLink) navigate(tokenLink);
  }, [navigate, tokenLink]);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); onOpen(); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      className={`token-activity relative w-[100dvw] ml-[calc(50%-50dvw)] mr-[calc(50%-50dvw)] px-2 ${mobileTight ? 'py-1' : 'py-2'} md:w-full md:mx-0 md:py-1 md:px-5 bg-transparent md:bg-[var(--glass-bg)] md:border md:border-transparent md:hover:border-white/25 md:rounded-[12px] md:backdrop-blur-xl transition-colors hover:shadow-none`}
      aria-label={tokenName ? `Open trend ${tokenName}` : 'Open trend'}
    >
      <div className="flex items-center justify-between gap-3 md:h-8">
        <div className="flex items-center gap-1 min-w-0">
          <AddressAvatarWithChainNameFeed address={creator} size={20} overlaySize={12} showAddressAndChainName={false} />
          <div className="flex items-center gap-1 min-w-0 text-[13px] leading-[1.2]">
            <a
              href={`/users/${creator}`}
              onClick={(e) => e.stopPropagation()}
              className="font-semibold text-white/90 truncate whitespace-nowrap max-w-[22ch] no-gradient-text"
              title={displayName}
            >
              {displayName}
            </a>
            <span className="text-white/70 shrink-0">created</span>
            {tokenName && (
              <span className="truncate max-w-[24ch] text-white/90">
                {linkify(`#${tokenName}`)}
              </span>
            )}
            <span className="text-white/50 shrink-0">·</span>
            <span className="text-white/60 shrink-0">{compactTime(item.created_at as unknown as string)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {tokenLink && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); navigate(tokenLink); }}
              className="inline-flex items-center gap-1.5 text-[12px] px-2 py-0 rounded-lg bg-transparent border-0 h-auto min-h-0 min-w-0 md:px-2 md:py-1 md:h-[28px] md:min-h-[28px] md:bg-white/[0.04] md:border md:border-white/25 md:hover:border-white/40 md:ring-1 md:ring-white/15 md:hover:ring-white/25 transition-colors"
              title="Buy"
            >
              <span className="hidden md:inline">Buy</span>
              <span className="md:hidden">Buy</span>
            </button>
          )}
        </div>
      </div>
      {/* Optional footer (mobile) */}
      {footer && (
        <div className="md:hidden mt-1 text-center">
          {footer}
        </div>
      )}
      {/* Full-bleed divider on mobile for visual rhythm (can be hidden for middle items or when followed by footer) */}
      {!hideMobileDivider && (
        <div className="md:hidden pointer-events-none absolute bottom-0 left-[calc(50%-50dvw)] w-[100dvw] h-px bg-white/10" />
      )}
    </article>
  );
});

TokenCreatedActivityItem.displayName = 'TokenCreatedActivityItem';

export default TokenCreatedActivityItem;


