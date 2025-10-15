import AddressAvatarWithChainNameFeed from "@/@components/Address/AddressAvatarWithChainNameFeed";
import { memo, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { linkify } from "../../../utils/linkify";
import { useWallet } from "../../../hooks";
import type { PostDto } from "../../../api/generated";
import { compactTime } from "../../../utils/time";
import SharePopover from "./SharePopover";

interface TokenCreatedActivityItemProps {
  item: PostDto;
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

const TokenCreatedActivityItem = memo(({ item }: TokenCreatedActivityItemProps) => {
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
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => { e.stopPropagation(); onOpen(); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      className="flex items-center justify-between gap-3 h-7 px-1 md:px-2"
      aria-label={tokenName ? `Open trend ${tokenName}` : 'Open trend'}
    >
      <div className="flex items-center gap-2 min-w-0">
        <AddressAvatarWithChainNameFeed address={creator} size={20} overlaySize={12} showAddressAndChainName={false} />
        <div className="flex items-center gap-1 min-w-0 text-[13px] leading-none">
          <span className="text-white/85 truncate max-w-[22ch]">{displayName}</span>
          <span className="text-white/50">·</span>
          <span className="text-white/70 shrink-0">Created</span>
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
            className="inline-flex items-center gap-1.5 text-[12px] px-0 py-0 rounded-lg bg-transparent border-0 h-auto min-h-0 min-w-0 md:px-2 md:py-1 md:h-[24px] md:min-h-[24px] md:bg-white/[0.04] md:border md:border-white/25 md:hover:border-white/40 md:ring-1 md:ring-white/15 md:hover:ring-white/25 transition-colors"
            title="Buy"
          >
            <span className="hidden md:inline">Buy</span>
            <span className="md:hidden">Buy</span>
          </button>
        )}
        <SharePopover postId={item.id} urlOverride={tokenLink} label="trend" />
      </div>
    </div>
  );
});

TokenCreatedActivityItem.displayName = 'TokenCreatedActivityItem';

export default TokenCreatedActivityItem;


