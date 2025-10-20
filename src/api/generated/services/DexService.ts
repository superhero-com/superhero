/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DexTokenDto } from '../models/DexTokenDto';
import type { DexTokenSummaryDto } from '../models/DexTokenSummaryDto';
import type { Pagination } from '../models/Pagination';
import type { PairTransactionDto } from '../models/PairTransactionDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DexService {
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
     * Get DEX token summary
     * Get comprehensive summary data for a token including aggregated volume and price changes across all pools where the token appears.
     * @returns DexTokenSummaryDto
     * @throws ApiError
     */
    public static getDexTokenSummary({
        address,
    }: {
        /**
         * Token contract address
         */
        address: string,
    }): CancelablePromise<DexTokenSummaryDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/dex/tokens/{address}/summary',
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
