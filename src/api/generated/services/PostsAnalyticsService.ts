/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class PostsAnalyticsService {
    /**
     * @returns any
     * @throws ApiError
     */
    public static getPostsAnalyticsData({
        startDate,
        endDate,
        senderAddress,
    }: {
        startDate?: string,
        endDate?: string,
        senderAddress?: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/posts/analytics',
            query: {
                'start_date': startDate,
                'end_date': endDate,
                'sender_address': senderAddress,
            },
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static getPostsPast24HoursAnalytics({
        senderAddress,
    }: {
        senderAddress?: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/posts/analytics/past-24-hours',
            query: {
                'sender_address': senderAddress,
            },
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static getTopPosters({
        startDate,
        endDate,
        limit,
    }: {
        startDate?: string,
        endDate?: string,
        limit?: number,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/posts/analytics/top-posters',
            query: {
                'start_date': startDate,
                'end_date': endDate,
                'limit': limit,
            },
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static getTopTopics({
        startDate,
        endDate,
        limit,
    }: {
        startDate?: string,
        endDate?: string,
        limit?: number,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/posts/analytics/top-topics',
            query: {
                'start_date': startDate,
                'end_date': endDate,
                'limit': limit,
            },
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static postAnalyticsControllerRoot(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/posts/analytics/preview',
        });
    }
}
