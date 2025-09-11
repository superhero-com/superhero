import React, { memo } from 'react';
import { AeButton } from '../../../components/ui/ae-button';
import { cn } from '@/lib/utils';

interface SortControlsProps {
  sortBy: string;
  onSortChange: (sortBy: string) => void;
  className?: string;
}

// Component: Sort Controls
const SortControls = memo(({ sortBy, onSortChange, className = '' }: SortControlsProps) => (
  <div className="flex gap-2 bg-white/5 rounded-full p-1 mb-4 border border-white/10 w-full md:w-auto">
      <AeButton
        onClick={() => onSortChange('latest')}
        variant={sortBy === 'latest' ? 'default' : 'ghost'}
        size="sm"
        noShadow={sortBy === 'latest'}
        className={cn(
          "flex-1 rounded-full px-6 py-2 text-sm font-semibold transition-all",
          sortBy === 'latest'
            ? "bg-primary-400 text-black hover:bg-primary-400 focus:bg-primary-400"
            : "text-white/70 hover:text-white hover:bg-white/10 focus:text-white focus:bg-white/10"
        )}
      >
      Latest
    </AeButton>
      <AeButton
        onClick={() => onSortChange('hot')}
        variant={sortBy === 'hot' ? 'default' : 'ghost'}
        size="sm"
        noShadow={sortBy === 'hot'}
        className={cn(
          "flex-1 rounded-full px-6 py-2 text-sm font-semibold transition-all",
          sortBy === 'hot'
            ? "bg-primary-400 text-black hover:bg-primary-400 focus:bg-primary-400"
            : "text-white/70 hover:text-white hover:bg-white/10 focus:text-white focus:bg-white/10"
        )}
      >
      Most Popular
    </AeButton>
  </div>
));

SortControls.displayName = 'SortControls';

export default SortControls;
