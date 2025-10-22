/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Pagination } from '../models/Pagination';
import type { PairDto } from '../models/PairDto';
import type { PairSummaryDto } from '../models/PairSummaryDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DexPairService {
    /**
     * Get all pairs
     * Retrieve a paginated list of all DEX pairs with optional sorting and search by token name or symbol
     * @returns any
     * @throws ApiError
     */
    public static listAllPairs({
        orderBy,
        orderDirection,
        limit,
        page,
        tokenAddress,
        search,
    }: {
        orderBy?: 'transactions_count' | 'created_at',
        orderDirection?: 'ASC' | 'DESC',
        limit?: number,
        page?: number,
        /**
         * Search by token address
         */
        tokenAddress?: string,
        /**
         * Search pairs by token name or symbol
         */
        search?: string,
    }): CancelablePromise<Pagination> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/dex/pairs',
            query: {
                'order_by': orderBy,
                'order_direction': orderDirection,
                'limit': limit,
                'page': page,
                'token_address': tokenAddress,
                'search': search,
            },
        });
    }
    /**
     * Get pair by address
     * Retrieve a specific pair by its contract address
     * @returns PairDto
     * @throws ApiError
     */
    public static getPairByAddress({
        address,
    }: {
        /**
         * Pair contract address
         */
        address: string,
    }): CancelablePromise<PairDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/dex/pairs/{address}',
            path: {
                'address': address,
            },
        });
    }
    /**
     * Get pair by from token and to token
     * Retrieve a specific pair by its contract address
     * @returns PairDto
     * @throws ApiError
     */
    public static getPairByFromTokenAndToToken({
        fromToken,
        toToken,
    }: {
        /**
         * Token address
         */
        fromToken: string,
        /**
         * Token address
         */
        toToken: string,
    }): CancelablePromise<PairDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/dex/pairs/from/{from_token}/to/{to_token}',
            path: {
                'from_token': fromToken,
                'to_token': toToken,
            },
        });
    }
    /**
     * Get all possible swap paths between two tokens
     * Find all possible swap paths from one token to another, including direct pairs and multi-hop paths
     * @returns any Returns all possible swap paths with direct pairs and multi-hop paths
     * @throws ApiError
     */
    public static findPairsForTokens({
        fromToken,
        toToken,
    }: {
        /**
         * Token address
         */
        fromToken: string,
        /**
         * Token address
         */
        toToken: string,
    }): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/dex/pairs/from/{from_token}/to/{to_token}/providers',
            path: {
                'from_token': fromToken,
                'to_token': toToken,
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
        fromToken,
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
        fromToken?: 'token0' | 'token1',
        convertTo?: 'ae' | 'usd' | 'eur' | 'aud' | 'brl' | 'cad' | 'chf' | 'gbp' | 'xau',
        limit?: number,
        page?: number,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/dex/pairs/{address}/history',
            path: {
                'address': address,
            },
            query: {
                'interval': interval,
                'from_token': fromToken,
                'convertTo': convertTo,
                'limit': limit,
                'page': page,
            },
        });
    }
    /**
     * Get pair summary
     * Get comprehensive summary data for a pair including volume, locked value, and price changes. Volume calculations can be based on token0, token1, or default to WAE if available.
     * @returns PairSummaryDto
     * @throws ApiError
     */
    public static getPairSummary({
        address,
        token,
    }: {
        /**
         * Pair contract address
         */
        address: string,
        /**
         * Token address to use as base for volume calculations (token0 or token1). If not provided, defaults to WAE if one of the tokens is WAE
         */
        token?: string,
    }): CancelablePromise<PairSummaryDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/dex/pairs/{address}/summary',
            path: {
                'address': address,
            },
            query: {
                'token': token,
            },
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static getPairPreview({
        address,
        interval,
    }: {
        /**
         * Pair contract address
         */
        address: string,
        interval?: '1d' | '7d' | '30d',
    }): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/dex/pairs/{address}/preview',
            path: {
                'address': address,
            },
            query: {
                'interval': interval,
            },
        });
    }
}
