import React from 'react';
import { getPlugin } from './registry';
import type { FeedEntry } from './types';
import ReplyToFeedItem from '@/features/social/components/ReplyToFeedItem';
import type { PostDto } from '@/api/generated';

type FeedRendererProps = {
  entry: FeedEntry;
  onOpenPost: (id: string) => void;
};

export default function FeedRenderer({ entry, onOpenPost }: FeedRendererProps) {
  const plugin = getPlugin(entry.kind);
  if (plugin) {
    const Comp = plugin.Render as any;
    return <Comp entry={entry} onOpen={onOpenPost} />;
  }

  // Fallback: core social posts
  if (entry.kind === 'post') {
    const post = (entry as FeedEntry<{ post: PostDto; commentCount?: number }>).data.post;
    const commentCount = (entry as FeedEntry<{ post: PostDto; commentCount?: number }>).data.commentCount ?? 0;
    return (
      <ReplyToFeedItem
        item={post}
        commentCount={commentCount}
        allowInlineRepliesToggle={false}
        onOpenPost={(id: string) => onOpenPost(String(id).replace(/_v3$/, ''))}
      />
    );
  }

  // Unknown kind: no-op to avoid crashing the feed
  return null;
}


