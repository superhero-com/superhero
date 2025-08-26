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
  size?: number;
  overlaySize?: number;
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

export interface CommentItemProps {
  comment: PostDto;
  chainNames: Record<string, string>;
  replies?: PostDto[];
  onCommentAdded?: () => void;
  depth?: number;
  maxDepth?: number;
}

export interface PostContentProps {
  post: any; // Using any for now since the old Backend API structure is different from PostDto
}

export interface CommentFormProps {
  postId: string;
  onCommentAdded?: () => void;
  placeholder?: string;
}
