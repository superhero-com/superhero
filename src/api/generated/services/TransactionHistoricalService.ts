/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class TransactionHistoricalService {
    /**
     * @returns any
     * @throws ApiError
     */
    public static findByAddress({
        address,
        interval,
        startDate,
        endDate,
        convertTo,
        mode,
    }: {
        /**
         * Token address or name
         */
        address: string,
        /**
         * Interval in seconds
         */
        interval?: number,
        startDate?: string,
        endDate?: string,
        convertTo?: 'ae' | 'usd' | 'eur' | 'aud' | 'brl' | 'cad' | 'chf' | 'gbp' | 'xau',
        mode?: 'normal' | 'aggregated',
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/tokens/{address}/transactions',
            path: {
                'address': address,
            },
            query: {
                'interval': interval,
                'start_date': startDate,
                'end_date': endDate,
                'convertTo': convertTo,
                'mode': mode,
            },
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static getPaginatedHistory({
        address,
        interval,
        convertTo,
        limit,
        page,
    }: {
        /**
         * Token address or name
         */
        address: string,
        /**
         * Interval type in seconds, default is 3600 (1 hour)
         */
        interval?: number,
        convertTo?: 'ae' | 'usd' | 'eur' | 'aud' | 'brl' | 'cad' | 'chf' | 'gbp' | 'xau',
        limit?: number,
        page?: number,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/tokens/{address}/history',
            path: {
                'address': address,
            },
            query: {
                'interval': interval,
                'convertTo': convertTo,
                'limit': limit,
                'page': page,
            },
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static getForPreview({
        address,
        interval,
    }: {
        /**
         * Token address or name
         */
        address: string,
        interval?: '1d' | '7d' | '30d',
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/tokens/preview/{address}',
            path: {
                'address': address,
            },
            query: {
                'interval': interval,
            },
        });
    }
}
