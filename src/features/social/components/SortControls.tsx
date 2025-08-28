import React, { memo } from 'react';
import AeButton from '../../../components/AeButton';

interface SortControlsProps {
  sortBy: string;
  onSortChange: (sortBy: string) => void;
}

// Component: Sort Controls
const SortControls = memo(({ sortBy, onSortChange }: SortControlsProps) => (
  <div className="actions">
    <div className="row">
      <AeButton 
        onClick={() => onSortChange('latest')}
        className={sortBy === 'latest' ? 'active' : ''}
      >
        Latest
      </AeButton>
      <AeButton 
        onClick={() => onSortChange('hot')}
        className={sortBy === 'hot' ? 'active' : ''}
      >
        Most Popular
      </AeButton>
      <AeButton 
        onClick={() => onSortChange('highest')}
        className={sortBy === 'highest' ? 'active' : ''}
      >
        Highest Rated
      </AeButton>
    </div>
  </div>
));

SortControls.displayName = 'SortControls';

export default SortControls;
