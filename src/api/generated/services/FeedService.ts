/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class FeedService {
    /**
     * Combined home feed
     * Keyset-paginated UNION of posts, token creations, and trades for `sort=latest`. `sort=hot` returns posts only, ranked by the existing popular-ranking algorithm (trades and token creations are never ranked under "Hot").
     * @returns any { items: [{ type, created_at, data }], next_cursor }
     * @throws ApiError
     */
    public static getFeed({
        sort,
        cursor,
        limit,
    }: {
        sort?: 'latest' | 'hot',
        cursor?: string,
        limit?: number,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/feed',
            query: {
                'sort': sort,
                'cursor': cursor,
                'limit': limit,
            },
        });
    }
}
