import { PostDto } from '../../../api/generated';

export interface PostApiResponse {
  items: PostDto[];
  meta: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
  };
}

export interface FeedItemProps {
  item: PostDto;
  commentCount: number;
  chainName?: string;
  onItemClick: (postId: string) => void;
}

export interface PostAvatarProps {
  authorAddress: string;
  chainName?: string;
}

export interface SortControlsProps {
  sortBy: string;
  onSortChange: (sortBy: string) => void;
}

export interface EmptyStateProps {
  type: 'error' | 'empty' | 'loading';
  error?: Error | null;
  hasSearch?: boolean;
  onRetry?: () => void;
}
