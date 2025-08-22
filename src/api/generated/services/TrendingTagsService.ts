/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateTrendingTagsDto } from '../models/CreateTrendingTagsDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class TrendingTagsService {
    /**
     * @returns any
     * @throws ApiError
     */
    public static listAll({
        orderBy,
        orderDirection,
        search,
        limit,
        page,
    }: {
        orderBy?: 'score' | 'source' | 'created_at',
        orderDirection?: 'ASC' | 'DESC',
        search?: string,
        limit?: number,
        page?: number,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/trending-tags',
            query: {
                'order_by': orderBy,
                'order_direction': orderDirection,
                'search': search,
                'limit': limit,
                'page': page,
            },
        });
    }
    /**
     * Create or update trending tags from external provider
     * Creates new trending tags or updates existing ones from external provider data. Tags are normalized (uppercase, alphanumeric only, camelCase to kebab-case). Existing tags are updated with new scores and token associations.
     * @returns any
     * @throws ApiError
     */
    public static createTrendingTags({
        requestBody,
    }: {
        /**
         * Trending tags data from external provider
         */
        requestBody: CreateTrendingTagsDto,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/trending-tags',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static getTrendingTag({
        tag,
    }: {
        tag: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/trending-tags/{tag}',
            path: {
                'tag': tag,
            },
        });
    }
}
