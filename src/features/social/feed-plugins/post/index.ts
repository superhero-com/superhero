import type { FeedEntry } from '../types';
import type { PostDto } from '@/api/generated';

export type PostEntryData = { post: PostDto; commentCount?: number };

export function adaptPostToEntry(post: PostDto, commentCount = 0): FeedEntry<PostEntryData> {
  const id = String(post.id);
  const createdAt = (post.created_at as unknown as string) || new Date().toISOString();
  return {
    id,
    kind: 'post',
    createdAt,
    data: { post, commentCount },
  };
}


