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

export interface Comment {
  id: string;
  text: string;
  timestamp: string;
  author?: string;
  address?: string;
  sender?: string;
  parentId?: string;
}

export interface CommentItemProps {
  comment: Comment;
  chainNames: Record<string, string>;
}

export interface PostContentProps {
  post: any; // Using any for now since the old Backend API structure is different from PostDto
}

export interface CommentFormProps {
  postId: string;
  onCommentAdded?: () => void;
  placeholder?: string;
}
