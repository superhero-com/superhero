/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class PostsService {
    /**
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
    }): CancelablePromise<any> {
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
     * @returns any
     * @throws ApiError
     */
    public static getById({
        id,
    }: {
        /**
         * Post ID
         */
        id: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/posts/{id}',
            path: {
                'id': id,
            },
        });
    }
}
