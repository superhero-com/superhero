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
        'relative w-[100dvw] ml-[calc(50%-50dvw)] mr-[calc(50%-50dvw)] md:w-full md:mx-0 bg-transparent',
        // Match post background and border opacities (align with ReplyToFeedItem)
        'md:bg-white/[0.05] md:border md:border-white/10 md:rounded-2xl md:backdrop-blur-xl',
        'transition-colors hover:border-white/25',
        styles.card,
        className,
      )}
      role={role}
      onClick={onClick}
    >
      <div className={styles.content}>{children}</div>
    </article>
  );
}


