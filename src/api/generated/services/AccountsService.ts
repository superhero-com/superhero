/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AccountSearchResultDto } from '../models/AccountSearchResultDto';
import type { GetPnlResponseDto } from '../models/GetPnlResponseDto';
import type { LeaderboardResponseDto } from '../models/LeaderboardResponseDto';
import type { NostrAccountRefDto } from '../models/NostrAccountRefDto';
import type { PortfolioHistorySnapshotDto } from '../models/PortfolioHistorySnapshotDto';
import type { TradingStatsResponseDto } from '../models/TradingStatsResponseDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AccountsService {
    /**
     * Returns paginated trading leaders with metrics (AUM, PNL, ROI, MDD), activity counters, and a portfolio sparkline. Without startDate + endDate, metrics are precomputed per window (7d / 30d / all). When startDate + endDate are supplied, leaders are ranked by selected-period performance among accounts that traded within that time range. In that mode, top-level metrics and buy/sell counts are scoped to the requested time range. Set tradingOnly=true to base selected-period PNL/ROI on realized token trading PNL, excluding transfer-driven portfolio changes. Note: responses are cached for up to 60 seconds, so `meta.timeFilter.start` and `meta.timeFilter.end` reflect the time the cache entry was filled, not strictly the time of the current request.
     * @returns LeaderboardResponseDto
     * @throws ApiError
     */
    public static getAccountsLeaderboard({
        window,
        sortBy,
        sortDir,
        page,
        limit,
        minAumUsd,
        startDate,
        endDate,
        tradingOnly,
        points,
        maxCandidates,
    }: {
        window?: '7d' | '30d' | 'all',
        sortBy?: 'pnl' | 'roi' | 'mdd' | 'aum',
        /**
         * Defaults to DESC, except for sortBy=mdd which defaults to ASC.
         */
        sortDir?: 'ASC' | 'DESC',
        page?: number,
        limit?: number,
        /**
         * Exclude leaders with AUM below this USD value.
         */
        minAumUsd?: number,
        /**
         * Optional absolute period start. Must be provided together with endDate.
         */
        startDate?: string,
        /**
         * Optional absolute period end. Must be provided together with startDate.
         */
        endDate?: string,
        /**
         * When true, selected-period PNL/ROI are based only on realized token trading PNL, excluding portfolio value changes caused by transfers.
         */
        tradingOnly?: boolean,
        /**
         * Approximate number of sparkline points (currently ignored).
         * @deprecated
         */
        points?: number,
        /**
         * Upper bound of candidate addresses to evaluate (ignored in snapshot mode).
         * @deprecated
         */
        maxCandidates?: number,
    }): CancelablePromise<LeaderboardResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/accounts/leaderboard',
            query: {
                'window': window,
                'sortBy': sortBy,
                'sortDir': sortDir,
                'page': page,
                'limit': limit,
                'minAumUsd': minAumUsd,
                'startDate': startDate,
                'endDate': endDate,
                'tradingOnly': tradingOnly,
                'points': points,
                'maxCandidates': maxCandidates,
            },
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static listAll({
        search,
        orderBy,
        orderDirection,
        hasNostr,
        limit,
        page,
    }: {
        /**
         * Search accounts by address or name
         */
        search?: string,
        orderBy?: 'total_volume' | 'total_tx_count' | 'total_buy_tx_count' | 'total_sell_tx_count' | 'total_created_tokens' | 'total_invitation_count' | 'total_claimed_invitation_count' | 'total_revoked_invitation_count' | 'created_at',
        orderDirection?: 'ASC' | 'DESC',
        /**
         * When true, only return accounts that have linked a Nostr key (`links->>'nostr' IS NOT NULL`) — e.g. to suggest chat contacts.
         */
        hasNostr?: boolean,
        limit?: number,
        page?: number,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/accounts',
            query: {
                'search': search,
                'order_by': orderBy,
                'order_direction': orderDirection,
                'has_nostr': hasNostr,
                'limit': limit,
                'page': page,
            },
        });
    }
    /**
     * @returns NostrAccountRefDto
     * @throws ApiError
     */
    public static resolveByNostr({
        pubkeys,
    }: {
        /**
         * Comma-separated nostr pubkeys (npub or 64-char hex), max 200.
         */
        pubkeys: string,
    }): CancelablePromise<Array<NostrAccountRefDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/accounts/by-nostr',
            query: {
                'pubkeys': pubkeys,
            },
        });
    }
    /**
     * Typeahead search for accounts by address or chain name
     * Powers account autocomplete. Returns `[]` when `q` is missing or blank.
     * @returns AccountSearchResultDto
     * @throws ApiError
     */
    public static searchAccounts({
        q,
        limit,
    }: {
        /**
         * Search term (address or chain name substring), max 100 characters.
         */
        q?: string,
        /**
         * Max results, clamped to 1-20 (default 8).
         */
        limit?: number,
    }): CancelablePromise<Array<AccountSearchResultDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/accounts/search',
            query: {
                'q': q,
                'limit': limit,
            },
        });
    }
    /**
     * Batch resolve chain names for a list of addresses
     * Every requested valid address is present in the result, mapped to its chain name or `null` when unknown / unset. Invalid addresses are silently dropped; at most 25 are resolved.
     * @returns any Map of address -> chain_name (string) or null.
     * @throws ApiError
     */
    public static getChainNamesForAddresses({
        addresses,
    }: {
        /**
         * Comma-separated account addresses, max 25 resolved.
         */
        addresses: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/accounts/chain-names',
            query: {
                'addresses': addresses,
            },
        });
    }
    /**
     * Portfolio value history snapshots
     * Returns portfolio value over time (AE balance, token values, total value). Pass include=pnl or include=pnl-range to add aggregate total_pnl data. Per-token PnL breakdown (tokens_pnl) is available via the dedicated :address/portfolio/tokens/history endpoint.
     * @returns PortfolioHistorySnapshotDto
     * @throws ApiError
     */
    public static getPortfolioHistory({
        address,
        startDate,
        endDate,
        interval = 86400,
        convertTo,
        include,
    }: {
        /**
         * Account address
         */
        address: string,
        /**
         * Start date (ISO 8601)
         */
        startDate?: string,
        /**
         * End date (ISO 8601)
         */
        endDate?: string,
        /**
         * Interval in seconds (default: 86400 for daily)
         */
        interval?: number,
        /**
         * Currency to convert to (default: ae)
         */
        convertTo?: 'ae' | 'usd' | 'eur' | 'aud' | 'brl' | 'cad' | 'chf' | 'gbp' | 'xau',
        /**
         * Comma-separated list of fields to include. "pnl" adds aggregate total_pnl, "pnl-range" uses daily-window PnL instead of cumulative. Per-token breakdown (tokens_pnl) is only available via the /portfolio/tokens/history endpoint.
         */
        include?: string,
    }): CancelablePromise<Array<PortfolioHistorySnapshotDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/accounts/{address}/portfolio/history',
            path: {
                'address': address,
            },
            query: {
                'startDate': startDate,
                'endDate': endDate,
                'interval': interval,
                'convertTo': convertTo,
                'include': include,
            },
        });
    }
    /**
     * Per-token PnL history snapshots
     * Returns portfolio history snapshots that include the per-token PnL breakdown (tokens_pnl). PnL data is always included; pass include=pnl-range to use range-based (daily window) PnL instead of cumulative.
     * @returns PortfolioHistorySnapshotDto
     * @throws ApiError
     */
    public static getTokensPnlHistory({
        address,
        startDate,
        endDate,
        interval = 86400,
        convertTo,
        include,
    }: {
        /**
         * Account address
         */
        address: string,
        /**
         * Start date (ISO 8601)
         */
        startDate?: string,
        /**
         * End date (ISO 8601)
         */
        endDate?: string,
        /**
         * Interval in seconds (default: 86400 for daily)
         */
        interval?: number,
        /**
         * Currency to convert to (default: ae)
         */
        convertTo?: 'ae' | 'usd' | 'eur' | 'aud' | 'brl' | 'cad' | 'chf' | 'gbp' | 'xau',
        /**
         * Comma-separated list of fields to include. "pnl" adds aggregate total_pnl, "pnl-range" uses daily-window PnL instead of cumulative. Per-token breakdown (tokens_pnl) is only available via the /portfolio/tokens/history endpoint.
         */
        include?: string,
    }): CancelablePromise<Array<PortfolioHistorySnapshotDto>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/accounts/{address}/portfolio/tokens/history',
            path: {
                'address': address,
            },
            query: {
                'startDate': startDate,
                'endDate': endDate,
                'interval': interval,
                'convertTo': convertTo,
                'include': include,
            },
        });
    }
    /**
     * SVG sparkline of daily (or hourly for a single-day range) realized PnL
     * @returns any
     * @throws ApiError
     */
    public static getPortfolioPnlChart({
        address,
        startDate,
        endDate,
        convertTo,
        background,
        height,
        width,
    }: {
        /**
         * Account address
         */
        address: string,
        startDate?: string,
        endDate?: string,
        convertTo?: 'ae' | 'usd',
        /**
         * CSS fill for background rect, e.g. "#1a1a2e" or "none"
         */
        background?: string,
        height?: number,
        width?: number,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/accounts/{address}/portfolio/pnl-chart.svg',
            path: {
                'address': address,
            },
            query: {
                'startDate': startDate,
                'endDate': endDate,
                'convertTo': convertTo,
                'background': background,
                'height': height,
                'width': width,
            },
        });
    }
    /**
     * @returns TradingStatsResponseDto
     * @throws ApiError
     */
    public static getPortfolioStats({
        address,
        startDate,
        endDate,
    }: {
        /**
         * Account address
         */
        address: string,
        /**
         * Start date (ISO 8601, inclusive). Defaults to 30 days ago.
         */
        startDate?: string,
        /**
         * End date (ISO 8601, exclusive). Defaults to now.
         */
        endDate?: string,
    }): CancelablePromise<TradingStatsResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/accounts/{address}/portfolio/stats',
            path: {
                'address': address,
            },
            query: {
                'startDate': startDate,
                'endDate': endDate,
            },
        });
    }
    /**
     * Latest portfolio value
     * Returns only the latest portfolio value snapshot ({ value, timestamp }), for callers polling for a live ticker. Use :address/portfolio/history for a full series.
     * @returns any
     * @throws ApiError
     */
    public static getCurrentPortfolioValue({
        address,
        convertTo,
    }: {
        /**
         * Account address
         */
        address: string,
        convertTo?: 'ae' | 'usd',
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/accounts/{address}/portfolio/value',
            path: {
                'address': address,
            },
            query: {
                'convertTo': convertTo,
            },
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static getAccount({
        address,
    }: {
        address: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/accounts/{address}',
            path: {
                'address': address,
            },
        });
    }
    /**
     * @returns GetPnlResponseDto
     * @throws ApiError
     */
    public static getPnl({
        address,
        blockHeight,
    }: {
        /**
         * Account address
         */
        address: string,
        /**
         * Block height (default: current block height)
         */
        blockHeight?: number,
    }): CancelablePromise<GetPnlResponseDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/accounts/{address}/pnl',
            path: {
                'address': address,
            },
            query: {
                'blockHeight': blockHeight,
            },
        });
    }
}
