import React from 'react';
import styles from './FeedPluginCard.module.scss';
import { cn } from '@/lib/utils';

type FeedPluginCardProps = React.PropsWithChildren<{
  className?: string;
  role?: string;
  onClick?: () => void;
}>;

export default function FeedPluginCard({ className, children, role, onClick }: FeedPluginCardProps) {
  return (
    <article
      className={cn(
        styles.root,
        'feed-plugin',
        // Match post item: glass background + border on desktop, transparent on mobile
        'relative w-[100dvw] ml-[calc(50%-50dvw)] mr-[calc(50%-50dvw)] px-2 md:w-full md:mx-0 md:p-5 bg-transparent',
        'md:bg-[var(--glass-bg)] md:border md:border-[var(--glass-border)] md:rounded-2xl md:backdrop-blur-xl',
        'transition-colors hover:border-white/25 hover:shadow-none',
        styles.card,
        className,
      )}
      role={role}
      onClick={onClick}
    >
      <div className={cn(styles.content, 'md:p-0')}>{children}</div>
    </article>
  );
}


