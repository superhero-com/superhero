/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Pagination } from '../models/Pagination';
import type { PostDto } from '../models/PostDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class PostsService {
    /**
     * Get all posts
     * Retrieve a paginated list of all posts with optional sorting
     * @returns any
     * @throws ApiError
     */
    public static listAll({
        orderBy,
        orderDirection,
        limit,
        page,
    }: {
        orderBy?: 'total_comments' | 'created_at',
        orderDirection?: 'ASC' | 'DESC',
        limit?: number,
        page?: number,
    }): CancelablePromise<Pagination> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/posts',
            query: {
                'order_by': orderBy,
                'order_direction': orderDirection,
                'limit': limit,
                'page': page,
            },
        });
    }
    /**
     * Get post by ID
     * Retrieve a specific post by its unique identifier
     * @returns PostDto Post retrieved successfully
     * @throws ApiError
     */
    public static getById({
        id,
    }: {
        /**
         * Post ID
         */
        id: string,
    }): CancelablePromise<PostDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/posts/{id}',
            path: {
                'id': id,
            },
        });
    }
}
