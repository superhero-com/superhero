/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DailyMarketCapSumDto } from '../models/DailyMarketCapSumDto';
import type { DailyTokenCountDto } from '../models/DailyTokenCountDto';
import type { DailyTradeVolumeResultDto } from '../models/DailyTradeVolumeResultDto';
import type { DailyUniqueActiveUsersResultDto } from '../models/DailyUniqueActiveUsersResultDto';
import type { MarketCapSumDto } from '../models/MarketCapSumDto';
import type { TotalUniqueUsersResultDto } from '../models/TotalUniqueUsersResultDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AnalyticsService {
    /**
     * Returns the count of tokens created per day
     * @returns DailyTokenCountDto Returns the count of tokens created per day
     * @throws ApiError
     */
    public static listDailyCreatedTokensCount({
        startDate,
        endDate,
    }: {
        startDate?: string,
        endDate?: string,
    }): CancelablePromise<Array<DailyTokenCountDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/analytics/daily-created-tokens-count',
            query: {
                'start_date': startDate,
                'end_date': endDate,
            },
        });
    }
    /**
     * Returns the sum of market caps for all tokens
     * @returns MarketCapSumDto Returns the sum of market caps for all tokens
     * @throws ApiError
     */
    public static getTotalMarketCap(): CancelablePromise<MarketCapSumDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/analytics/total-market-cap',
        });
    }
    /**
     * Returns the total number of tokens created
     * @returns number Returns the total number of tokens created
     * @throws ApiError
     */
    public static getTotalCreatedTokens(): CancelablePromise<number> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/analytics/total-created-tokens',
        });
    }
    /**
     * Returns the daily trade volume for a given token or account
     * @returns DailyTradeVolumeResultDto Returns daily trade volume data
     * @throws ApiError
     */
    public static dailyTradeVolume({
        startDate,
        endDate,
        tokenAddress,
        accountAddress,
    }: {
        /**
         * Start date for the query (YYYY-MM-DD)
         */
        startDate?: string,
        /**
         * End date for the query (YYYY-MM-DD)
         */
        endDate?: string,
        /**
         * Token address to filter by
         */
        tokenAddress?: string,
        /**
         * Account address to filter by
         */
        accountAddress?: string,
    }): CancelablePromise<Array<DailyTradeVolumeResultDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/analytics/daily-trade-volume',
            query: {
                'start_date': startDate,
                'end_date': endDate,
                'token_address': tokenAddress,
                'account_address': accountAddress,
            },
        });
    }
    /**
     * Returns the daily unique active users for a given token
     * @returns DailyUniqueActiveUsersResultDto Returns daily unique active users data
     * @throws ApiError
     */
    public static listDailyUniqueActiveUsers({
        startDate,
        endDate,
        tokenAddress,
    }: {
        /**
         * Start date for the query (YYYY-MM-DD)
         */
        startDate?: string,
        /**
         * End date for the query (YYYY-MM-DD)
         */
        endDate?: string,
        /**
         * Token address to filter by
         */
        tokenAddress?: string,
    }): CancelablePromise<Array<DailyUniqueActiveUsersResultDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/analytics/daily-unique-active-users',
            query: {
                'start_date': startDate,
                'end_date': endDate,
                'token_address': tokenAddress,
            },
        });
    }
    /**
     * Returns the total number of unique users across the entire system
     * @returns TotalUniqueUsersResultDto Returns total unique users count
     * @throws ApiError
     */
    public static totalUniqueUsers({
        tokenSaleAddresses,
    }: {
        tokenSaleAddresses?: any[],
    }): CancelablePromise<TotalUniqueUsersResultDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/analytics/total-unique-users',
            query: {
                'token_sale_addresses': tokenSaleAddresses,
            },
        });
    }
    /**
     * Returns the sum of market caps for all tokens per day
     * @returns DailyMarketCapSumDto Returns the sum of market caps for all tokens per day
     * @throws ApiError
     */
    public static listDailyMarketCapSum({
        startDate,
        endDate,
        tokenSaleAddresses,
    }: {
        startDate?: string,
        endDate?: string,
        tokenSaleAddresses?: any[],
    }): CancelablePromise<Array<DailyMarketCapSumDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/analytics/daily-market-cap-sum',
            query: {
                'start_date': startDate,
                'end_date': endDate,
                'token_sale_addresses': tokenSaleAddresses,
            },
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static getAnalyticsData({
        startDate,
        endDate,
        forcePull,
    }: {
        startDate?: string,
        endDate?: string,
        forcePull?: boolean,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/analytics',
            query: {
                'start_date': startDate,
                'end_date': endDate,
                'force_pull': forcePull,
            },
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static getPast24HoursAnalytics(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/analytics/past-24-hours',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static analyticControllerRoot(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/analytics/preview',
        });
    }
}
