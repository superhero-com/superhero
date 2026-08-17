/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DexTokenDto } from '../models/DexTokenDto';
import type { DexTokenSummaryDto } from '../models/DexTokenSummaryDto';
import type { Pagination } from '../models/Pagination';
import type { PairTransactionDto } from '../models/PairTransactionDto';
import type { SetListedDto } from '../models/SetListedDto';
import type { SwapRoutePairDto } from '../models/SwapRoutePairDto';
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
        listed,
        search,
        limit,
        page,
    }: {
        orderBy?: 'pairs_count' | 'name' | 'symbol' | 'created_at' | 'price' | 'tvl' | '24hchange' | '24hvolume' | '7dchange' | '7dvolume' | '30dchange' | '30dvolume',
        orderDirection?: 'ASC' | 'DESC',
        /**
         * Filter to only listed (true) or only unlisted (false) tokens. Omit to return all tokens.
         */
        listed?: boolean,
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
                'listed': listed,
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
     * Retrieve a token together with its current price and price metadata.
     * @returns any The token plus its price and price metadata
     * @throws ApiError
     */
    public static getTokenPrice({
        address,
    }: {
        /**
         * Token contract address
         */
        address: string,
    }): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/dex/tokens/{address}/price',
            path: {
                'address': address,
            },
        });
    }
    /**
     * Get comprehensive token price analysis
     * Get detailed price analysis including liquidity-weighted pricing, confidence metrics, and all possible paths
     * @returns any Comprehensive price analysis with liquidity weighting
     * @throws ApiError
     */
    public static getTokenPriceWithLiquidityAnalysis({
        address,
        baseToken,
        debug,
    }: {
        /**
         * Token contract address
         */
        address: string,
        /**
         * Base token for price calculation (default: WAE)
         */
        baseToken?: string,
        /**
         * Include detailed path analysis
         */
        debug?: boolean,
    }): CancelablePromise<Record<string, any>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/dex/tokens/{address}/price/analysis',
            path: {
                'address': address,
            },
            query: {
                'base_token': baseToken,
                'debug': debug,
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
     * Get DEX token price history
     * Get OHLCV price history for a single token. The series is derived from the deepest pool that pairs the token against WAE (so the price is expressed in AE); if no WAE pool exists, the deepest available pool is used. Pass convertTo to express the values in a fiat currency.
     * @returns any
     * @throws ApiError
     */
    public static getDexTokenHistory({
        address,
        interval,
        convertTo,
        limit,
        page,
    }: {
        /**
         * Token contract address
         */
        address: string,
        /**
         * Candle interval in seconds (default 3600, min 60, max 86400)
         */
        interval?: number,
        /**
         * Currency the OHLC/market-cap/volume values are converted into (default: ae). Fiat conversion uses the AE→currency rate as of each candle’s time (historical coin_prices snapshots) and requires the token to have a WAE-quoted pool; requesting a fiat currency for a token without one returns 400.
         */
        convertTo?: 'ae' | 'usd' | 'eur' | 'aud' | 'brl' | 'cad' | 'chf' | 'gbp' | 'xau',
        limit?: number,
        page?: number,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/dex/tokens/{address}/history',
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
     * Set the listed flag for a DEX token (admin)
     * Mark a token as listed/unlisted. Requires an API key (x-api-key header or Bearer token).
     * @returns DexTokenDto
     * @throws ApiError
     */
    public static setDexTokenListed({
        address,
        requestBody,
    }: {
        /**
         * Token contract address
         */
        address: string,
        requestBody: SetListedDto,
    }): CancelablePromise<DexTokenDto> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/dex/tokens/{address}/listed',
            path: {
                'address': address,
            },
            body: requestBody,
            mediaType: 'application/json',
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
        tokenAddress,
        txType,
        accountAddress,
        fromDate,
        toDate,
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
         * Filter by account address
         */
        tokenAddress?: string,
        /**
         * Filter by transaction type
         */
        txType?: string,
        /**
         * Filter by account address
         */
        accountAddress?: string,
        /**
         * Only include transactions at or after this ISO-8601 date/time (created_at >= from_date)
         */
        fromDate?: string,
        /**
         * Only include transactions at or before this ISO-8601 date/time (created_at <= to_date)
         */
        toDate?: string,
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
                'token_address': tokenAddress,
                'tx_type': txType,
                'account_address': accountAddress,
                'from_date': fromDate,
                'to_date': toDate,
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
    /**
     * Get swap routes between two tokens
     * Returns all swap routes (direct and single-hop) from one token to another, used by the swap UI to quote a trade. Each route is an ordered array of pairs. Returns an empty array when no route exists.
     * @returns SwapRoutePairDto All swap routes between the tokens; each route is an ordered array of pairs
     * @throws ApiError
     */
    public static getSwapRoutes({
        fromToken,
        toToken,
    }: {
        /**
         * Source token contract address
         */
        fromToken: string,
        /**
         * Destination token contract address
         */
        toToken: string,
    }): CancelablePromise<Array<Array<SwapRoutePairDto>>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/dex/swap-routes/{from_token}/{to_token}',
            path: {
                'from_token': fromToken,
                'to_token': toToken,
            },
        });
    }
}
