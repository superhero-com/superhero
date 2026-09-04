import {
  useCallback, useEffect, useLayoutEffect, useState,
} from 'react';
import { createPortal } from 'react-dom';
import AddressAvatar from '@/components/AddressAvatar';
import { cn } from '@/lib/utils';
import { formatAddress } from '@/utils/address';
import type { MentionItem } from '../hooks/useMentionSearch';

interface MentionSuggestionListProps {
  items: MentionItem[];
  activeIndex: number;
  onHover: (index: number) => void;
  onSelect: (item: MentionItem) => void;
  // Element the list anchors under. The list is portalled to <body> so it escapes
  // the composer card's `backdrop-blur` stacking context; a raised z-index inside
  // that context cannot beat the feed painted after it.
  anchorEl: HTMLElement | null;
}

// Rows use `onMouseDown` (not click) so selecting does not blur the textarea
// before the handler runs.
export const MentionSuggestionList = ({
  items,
  activeIndex,
  onHover,
  onSelect,
  anchorEl,
}: MentionSuggestionListProps) => {
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const place = useCallback(() => {
    if (!anchorEl) return;
    const r = anchorEl.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left, width: r.width });
  }, [anchorEl]);

  useLayoutEffect(place, [place, items.length]);

  useEffect(() => {
    place();
    // `true` (capture) so a scroll in any ancestor, not just window, repositions.
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [place]);

  if (!pos) return null;

  const list = (
    <div
      role="listbox"
      aria-label="Mention suggestions"
      style={{
        position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 2000,
      }}
      className="max-h-64 overflow-y-auto rounded-xl border border-white/15 bg-gray-900/95 backdrop-blur-xl shadow-[0_16px_30px_rgba(0,0,0,0.4)] py-1"
    >
      {items.map((item, index) => {
        const isActive = index === activeIndex;
        const key = item.type === 'account' ? `a-${item.address}` : `t-${item.name}`;
        return (
          <button
            type="button"
            key={key}
            role="option"
            aria-selected={isActive}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 text-left transition-colors',
              isActive ? 'bg-white/10' : 'hover:bg-white/5',
            )}
            onMouseEnter={() => onHover(index)}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(item);
            }}
          >
            {item.type === 'account' ? (
              <>
                <AddressAvatar address={item.address} size={24} />
                <div className="min-w-0">
                  <div className="text-sm text-white truncate">
                    {item.chainName ? `@${item.chainName}` : formatAddress(item.address, 6, true)}
                  </div>
                  {item.chainName && (
                  <div className="text-[11px] text-white/50 truncate font-mono">
                    {formatAddress(item.address, 4, true)}
                  </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="w-6 h-6 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-[11px] font-bold text-[var(--neon-blue)] flex-shrink-0">
                  #
                </div>
                <div className="min-w-0">
                  <div className="text-sm text-white truncate">{`#${item.name}`}</div>
                  {item.symbol && item.symbol.toLowerCase() !== item.name.toLowerCase() && (
                  <div className="text-[11px] text-white/50 truncate">{item.symbol}</div>
                  )}
                </div>
              </>
            )}
          </button>
        );
      })}
    </div>
  );

  return createPortal(list, document.body);
};

export default MentionSuggestionList;
