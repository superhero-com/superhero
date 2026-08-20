import AddressAvatar from '@/components/AddressAvatar';
import { cn } from '@/lib/utils';
import { formatAddress } from '@/utils/address';
import type { MentionItem } from '../hooks/useMentionSearch';

interface MentionSuggestionListProps {
  items: MentionItem[];
  activeIndex: number;
  onHover: (index: number) => void;
  onSelect: (item: MentionItem) => void;
}

// Rows use `onMouseDown` (not click) so selecting does not blur the textarea
// before the handler runs.
export const MentionSuggestionList = ({
  items,
  activeIndex,
  onHover,
  onSelect,
}: MentionSuggestionListProps) => (
  <div
    role="listbox"
    aria-label="Mention suggestions"
    className="absolute left-0 right-0 top-full mt-1 z-30 max-h-64 overflow-y-auto rounded-xl border border-white/15 bg-gray-900/95 backdrop-blur-xl shadow-[0_16px_30px_rgba(0,0,0,0.4)] py-1"
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

export default MentionSuggestionList;
