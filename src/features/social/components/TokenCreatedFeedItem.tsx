import AddressAvatarWithChainNameFeed from "@/@components/Address/AddressAvatarWithChainNameFeed";
import { cn } from "@/lib/utils";
import { memo, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { linkify } from "../../../utils/linkify";
import BlockchainInfoPopover from "./BlockchainInfoPopover";
import SharePopover from "./SharePopover";
import { useWallet } from "../../../hooks";
import type { PostDto } from "../../../api/generated";
import { compactTime, fullTimestamp } from "../../../utils/time";

interface TokenCreatedFeedItemProps {
  item: PostDto;
  onOpenPost: (postId: string) => void;
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

// Token-created feed item rendered similar to a reply with a header box
const TokenCreatedFeedItem = memo(({ item, onOpenPost }: TokenCreatedFeedItemProps) => {
  const postId = item.id;
  const authorAddress = item.sender_address;
  const { chainNames } = useWallet();
  const displayName = chainNames?.[authorAddress] || "Legend";
  const tokenName = useTokenName(item);
  const tokenLink = tokenName ? `/trends/tokens/${tokenName}` : undefined;

  const handleOpen = useCallback(() => onOpenPost(postId), [onOpenPost, postId]);
  const navigate = useNavigate();

  return (
    <article
      className={cn(
        "relative w-[100dvw] ml-[calc(50%-50dvw)] mr-[calc(50%-50dvw)] px-2 pt-4 pb-5 md:w-full md:mx-0 md:p-5 bg-transparent md:bg-[var(--glass-bg)] md:border md:border-[var(--glass-border)] md:rounded-2xl md:backdrop-blur-xl transition-colors hover:border-white/25 hover:shadow-none"
      )}
      onClick={handleOpen}
      role="button"
      aria-label="Open post"
    >
      {item.tx_hash && (
        <div className="absolute top-4 right-2 md:top-5 md:right-5 z-10">
          <BlockchainInfoPopover
            txHash={item.tx_hash}
            createdAt={item.created_at as unknown as string}
            sender={item.sender_address}
            contract={(item as any).contract_address}
            postId={String(item.id)}
            className="px-2"
            showLabel
          />
        </div>
      )}

      <div className="flex gap-2 md:gap-3 items-start">
        <div className="flex-shrink-0 pt-0.5">
          <div className="md:hidden">
            <AddressAvatarWithChainNameFeed address={authorAddress} size={34} overlaySize={16} showAddressAndChainName={false} />
          </div>
          <div className="hidden md:block">
            <AddressAvatarWithChainNameFeed address={authorAddress} size={40} overlaySize={20} showAddressAndChainName={false} />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {/* Header: name · time */}
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-baseline gap-2.5 min-w-0">
              <div className="text-[15px] font-semibold text-white truncate">{displayName}</div>
              <span className="text-white/50 shrink-0">·</span>
              <div className="text-[12px] text-white/70 whitespace-nowrap shrink-0" title={fullTimestamp(item.created_at as unknown as string)}>{compactTime(item.created_at as unknown as string)}</div>
            </div>
          </div>
          <div className="mt-1 text-[9px] md:text-[10px] text-white/65 font-mono leading-[1.2] truncate">{authorAddress}</div>

          {/* Tokenized trend header */}
          <div
            className="mt-3 mb-2 w-full text-left bg-white/[0.04] rounded-xl p-3"
            title="Open token"
          >
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-[11px] text-white/65 shrink-0">Created</span>
              {tokenName && (
                <span className="text-[12px] text-white/90 truncate">
                  {linkify(`#${tokenName}`, { knownChainNames: new Set(Object.values(chainNames || {}).map((n) => n?.toLowerCase())) })}
                </span>
              )}
            </div>
          </div>

          {/* Actions: Buy + Share */}
          <div className="mt-4 flex items-center justify-between">
            <div className="inline-flex items-center gap-2">
              {tokenLink && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); navigate(tokenLink); }}
                  className="inline-flex items-center gap-1.5 text-[13px] px-0 py-0 rounded-lg bg-transparent border-0 h-auto min-h-0 min-w-0 md:px-2.5 md:py-1 md:h-[28px] md:min-h-[28px] md:bg-white/[0.04] md:border md:border-white/25 md:hover:border-white/40 md:ring-1 md:ring-white/15 md:hover:ring-white/25 transition-colors"
                  title="Buy"
                >
                  Buy
                </button>
              )}
            </div>
            <SharePopover postId={item.id} urlOverride={tokenLink} label="trend" />
          </div>
        </div>
      </div>
      <div className="md:hidden pointer-events-none absolute bottom-0 left-[calc(50%-50dvw)] w-[100dvw] h-px bg-white/10" />
    </article>
  );
});

TokenCreatedFeedItem.displayName = "TokenCreatedFeedItem";

export default TokenCreatedFeedItem;


