import React, { memo } from 'react';
import { AeButton } from '../../../components/ui/ae-button';
import { AeCard, AeCardContent } from '../../../components/ui/ae-card';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  type: 'error' | 'empty' | 'loading';
  error?: Error | null;
  hasSearch?: boolean;
  onRetry?: () => void;
}

// Component: Empty State
const EmptyState = memo(({ type, error, hasSearch, onRetry }: EmptyStateProps) => {
  const getContent = () => {
    switch (type) {
      case 'error':
        return {
          title: 'Failed to load posts',
          subtitle: error instanceof Error ? error.message : 'An error occurred while fetching posts',
          showRetry: true
        };
      case 'empty':
        return {
          title: hasSearch ? 'No posts found matching your search.' : 'No posts found.',
          subtitle: hasSearch ? 'Try adjusting your search terms or filters.' : undefined,
          showRetry: false
        };
      case 'loading':
        return {
          title: 'Loading posts...',
          subtitle: undefined,
          showRetry: false
        };
      default:
        return { title: '', subtitle: undefined, showRetry: false };
    }
  };

  const { title, subtitle, showRetry } = getContent();

  const getIcon = () => {
    switch (type) {
      case 'error':
        return '⚠️';
      case 'empty':
        return hasSearch ? '🔍' : '📭';
      case 'loading':
        return '⏳';
      default:
        return '📭';
    }
  };

  return (
    <AeCard variant="glass" className="mx-auto max-w-md">
      <AeCardContent className="flex flex-col items-center text-center p-8 space-y-4">
        <div className="text-4xl opacity-60">{getIcon()}</div>
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {showRetry && onRetry && (
          <AeButton 
            onClick={onRetry} 
            variant="outline" 
            size="sm"
            className="mt-4"
          >
            Retry
          </AeButton>
        )}
      </AeCardContent>
    </AeCard>
  );
});

EmptyState.displayName = 'EmptyState';

export default EmptyState;
