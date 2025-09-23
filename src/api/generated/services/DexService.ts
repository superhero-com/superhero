/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DexTokenDto } from '../models/DexTokenDto';
import type { Pagination } from '../models/Pagination';
import type { PairDto } from '../models/PairDto';
import type { PairTransactionDto } from '../models/PairTransactionDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DexService {
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
     * Get all DEX tokens
     * Retrieve a paginated list of all DEX tokens with optional sorting
     * @returns any
     * @throws ApiError
     */
    public static listAllDexTokens({
        orderBy,
        orderDirection,
        search,
        limit,
        page,
    }: {
        orderBy?: 'pairs_count' | 'name' | 'symbol' | 'created_at',
        orderDirection?: 'ASC' | 'DESC',
        search?: string,
        limit?: number,
        page?: number,
    }): CancelablePromise<Pagination> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/dex/tokens',
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
     * Get DEX token by address
     * Retrieve a specific DEX token by its contract address
     * @returns DexTokenDto
     * @throws ApiError
     */
    public static getDexTokenByAddress({
        address,
    }: {
        /**
         * Token contract address
         */
        address: string,
    }): CancelablePromise<DexTokenDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/dex/tokens/{address}',
            path: {
                'address': address,
            },
        });
    }
    /**
     * Get DEX token price
     * Retrieve a specific DEX token by its contract address
     * @returns DexTokenDto
     * @throws ApiError
     */
    public static getTokenPrice({
        address,
    }: {
        /**
         * Token contract address
         */
        address: string,
    }): CancelablePromise<DexTokenDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/dex/tokens/{address}/price',
            path: {
                'address': address,
            },
        });
    }
    /**
     * Get all pair transactions
     * Retrieve a paginated list of all DEX pair transactions with optional filtering and sorting
     * @returns any
     * @throws ApiError
     */
    public static listAllPairTransactions({
        orderBy,
        orderDirection,
        pairAddress,
        txType,
        accountAddress,
        limit,
        page,
    }: {
        orderBy?: 'created_at' | 'tx_type',
        orderDirection?: 'ASC' | 'DESC',
        /**
         * Filter by specific pair address
         */
        pairAddress?: string,
        /**
         * Filter by transaction type
         */
        txType?: string,
        /**
         * Filter by account address
         */
        accountAddress?: string,
        limit?: number,
        page?: number,
    }): CancelablePromise<Pagination> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/dex/transactions',
            query: {
                'order_by': orderBy,
                'order_direction': orderDirection,
                'pair_address': pairAddress,
                'tx_type': txType,
                'account_address': accountAddress,
                'limit': limit,
                'page': page,
            },
        });
    }
    /**
     * Get pair transaction by transaction hash
     * Retrieve a specific pair transaction by its transaction hash
     * @returns PairTransactionDto
     * @throws ApiError
     */
    public static getPairTransactionByTxHash({
        txHash,
    }: {
        /**
         * Transaction hash
         */
        txHash: string,
    }): CancelablePromise<PairTransactionDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/dex/transactions/{txHash}',
            path: {
                'txHash': txHash,
            },
        });
    }
    /**
     * Get pair transactions by pair address
     * Retrieve paginated transactions for a specific pair
     * @returns any
     * @throws ApiError
     */
    public static getPairTransactionsByPairAddress({
        pairAddress,
        orderBy,
        orderDirection,
        limit,
        page,
    }: {
        /**
         * Pair contract address
         */
        pairAddress: string,
        orderBy?: 'created_at' | 'tx_type',
        orderDirection?: 'ASC' | 'DESC',
        limit?: number,
        page?: number,
    }): CancelablePromise<Pagination> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/dex/transactions/pair/{pairAddress}',
            path: {
                'pairAddress': pairAddress,
            },
            query: {
                'order_by': orderBy,
                'order_direction': orderDirection,
                'limit': limit,
                'page': page,
            },
        });
    }
}
