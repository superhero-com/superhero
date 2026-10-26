import { PostDto } from '../../../api/generated';

export interface PostApiResponse {
  items: PostDto[];
  meta: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
  };
}
