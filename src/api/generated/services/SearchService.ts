/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SearchResultDto } from '../models/SearchResultDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SearchService {
    /**
     * Unified search across tokens, accounts, and posts
     * Runs the token/account/post lookups in parallel server-side, each capped at `limit`. Returns empty arrays for `q` shorter than 2 characters.
     * @returns SearchResultDto
     * @throws ApiError
     */
    public static search({
        q,
        limit,
    }: {
        /**
         * Search term, max 100 characters.
         */
        q: string,
        /**
         * Max results per category, clamped to 1-20 (default 5).
         */
        limit?: number,
    }): CancelablePromise<SearchResultDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/search',
            query: {
                'q': q,
                'limit': limit,
            },
        });
    }
}
