import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { AeButton } from '../../../components/ui/ae-button';
import { AeCard, AeCardContent } from '../../../components/ui/ae-card';

interface EmptyStateProps {
  type: 'error' | 'empty' | 'loading';
  error?: Error | null;
  hasSearch?: boolean;
  onRetry?: () => void;
}

// Component: Empty State
const EmptyState = memo(({
  type, error, hasSearch, onRetry,
}: EmptyStateProps) => {
  const { t } = useTranslation();
  const getContent = () => {
    switch (type) {
      case 'error':
        return {
          title: t('social.emptyState.failedToLoadPosts'),
          subtitle: error instanceof Error ? error.message : t('social.emptyState.errorFetchingPosts'),
          showRetry: true,
        };
      case 'empty':
        return {
          title: hasSearch ? t('social.emptyState.noPostsMatchingSearch') : t('social.emptyState.noPostsFound'),
          subtitle: hasSearch ? t('social.emptyState.tryAdjustingSearch') : undefined,
          showRetry: false,
        };
      case 'loading':
        return {
          title: t('social.emptyState.loadingPosts'),
          subtitle: undefined,
          showRetry: false,
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
    <AeCard variant="glass" className="mx-auto max-w-md mt-4">
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
            {t('social.retry')}
          </AeButton>
        )}
      </AeCardContent>
    </AeCard>
  );
});

EmptyState.displayName = 'EmptyState';

export default EmptyState;
