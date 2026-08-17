/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class CoinsService {
    /**
     * Get current currency rates for Aeternity
     * Returns current exchange rates for Aeternity in all supported fiat currencies.
     * @returns number Current currency rates for all supported fiat currencies
     * @throws ApiError
     */
    public static getCurrencyRates(): CancelablePromise<Record<string, number>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/coins/aeternity/rates',
        });
    }
    /**
     * Get historical price data for Aeternity
     * Returns historical price data for Aeternity as an array of [timestamp_ms, price] pairs.
     * @returns number Historical price data as array of [timestamp_ms, price] pairs
     * @throws ApiError
     */
    public static getHistoricalPrice({
        currency,
        interval,
        days,
    }: {
        /**
         * Target currency code (default: usd)
         */
        currency?: string,
        /**
         * Interval for historical data points (default: daily). Hourly interval is only available for 1-90 days. For days>90, only daily data is available.
         */
        interval?: 'daily' | 'hourly',
        /**
         * Number of days of history to fetch. Supported values: 1, 7, 14, 30, 90, 180, 365, max. Default: 365
         */
        days?: string,
    }): CancelablePromise<Array<Array<number>>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/coins/aeternity/history',
            query: {
                'currency': currency,
                'interval': interval,
                'days': days,
            },
        });
    }
    /**
     * Get market data for Aeternity
     * Returns detailed market data including price, market cap, volume, etc.
     * @returns any Market data response
     * @throws ApiError
     */
    public static getMarketData({
        currency,
    }: {
        /**
         * Target currency code (default: usd)
         */
        currency?: string,
    }): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/coins/aeternity/market-data',
            query: {
                'currency': currency,
            },
        });
    }
}
