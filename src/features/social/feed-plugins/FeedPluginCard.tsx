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
    <article className={cn(styles.root, 'feed-plugin', styles.card, className)} role={role} onClick={onClick}>
      <div className={styles.content}>{children}</div>
    </article>
  );
}


