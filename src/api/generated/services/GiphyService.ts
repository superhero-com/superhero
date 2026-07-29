/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { GiphySearchResponseDto } from '../models/GiphySearchResponseDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class GiphyService {
    /**
     * Search or list trending GIFs
     * Proxies GIF search/trending via Giphy (when configured) with InfiniteGIF as fallback. Results are cached for 1 hour.
     * @returns GiphySearchResponseDto
     * @throws ApiError
     */
    public static giphySearch({
        q,
        offset,
        limit,
    }: {
        /**
         * Search query. Omit for trending GIFs.
         */
        q?: string,
        /**
         * Pagination offset
         */
        offset?: number,
        /**
         * Number of results (max 50)
         */
        limit?: number,
    }): CancelablePromise<GiphySearchResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/giphy/search',
            query: {
                'q': q,
                'offset': offset,
                'limit': limit,
            },
        });
    }
}
