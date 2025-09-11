import React, { memo } from 'react';
import { AeButton } from '../../../components/ui/ae-button';
import { cn } from '@/lib/utils';

interface SortControlsProps {
  sortBy: string;
  onSortChange: (sortBy: string) => void;
}

// Component: Sort Controls
const SortControls = memo(({ sortBy, onSortChange }: SortControlsProps) => (
  <div className="flex justify-center p-4">
    <div className="flex gap-2 bg-muted/20 rounded-full p-1 backdrop-blur-sm border border-muted/50">
      <AeButton
        onClick={() => onSortChange('latest')}
        variant={sortBy === 'latest' ? 'default' : 'ghost'}
        size="sm"
        className={cn(
          "rounded-full px-6 py-2 text-sm font-semibold transition-all",
          sortBy === 'latest' 
            ? "bg-accent text-accent-foreground shadow-md" 
            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
        )}
      >
        Latest
      </AeButton>
      <AeButton
        onClick={() => onSortChange('hot')}
        variant={sortBy === 'hot' ? 'default' : 'ghost'}
        size="sm"
        className={cn(
          "rounded-full px-6 py-2 text-sm font-semibold transition-all",
          sortBy === 'hot' 
            ? "bg-accent text-accent-foreground shadow-md" 
            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
        )}
      >
        Most Popular
      </AeButton>
    </div>
  </div>
));

SortControls.displayName = 'SortControls';

export default SortControls;
