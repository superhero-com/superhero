/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Pagination } from '../models/Pagination';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class TipsService {
    /**
     * List tips
     * Paginated tips with optional filters and ordering
     * @returns any
     * @throws ApiError
     */
    public static listTips({
        orderBy,
        orderDirection,
        sender,
        receiver,
        type,
        limit,
        page,
    }: {
        orderBy?: 'amount' | 'type' | 'created_at',
        orderDirection?: 'ASC' | 'DESC',
        sender?: string,
        receiver?: string,
        type?: string,
        limit?: number,
        page?: number,
    }): CancelablePromise<Pagination> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/tips',
            query: {
                'order_by': orderBy,
                'order_direction': orderDirection,
                'sender': sender,
                'receiver': receiver,
                'type': type,
                'limit': limit,
                'page': page,
            },
        });
    }
    /**
     * Account tips summary
     * Returns total tips sent and received for an account
     * @returns any
     * @throws ApiError
     */
    public static getAccountSummary({
        address,
    }: {
        /**
         * Account address
         */
        address: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/tips/accounts/{address}/summary',
            path: {
                'address': address,
            },
        });
    }
    /**
     * Post tips summary
     * Returns total tips amount for a post
     * @returns any
     * @throws ApiError
     */
    public static getPostSummary({
        postId,
    }: {
        /**
         * Post ID
         */
        postId: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/tips/posts/{postId}/summary',
            path: {
                'postId': postId,
            },
        });
    }
}
