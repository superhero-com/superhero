/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PnlAmountDto } from './PnlAmountDto';
export type TradingStatsResponseDto = {
    /**
     * Largest single realized gain from any sell in the date range
     */
    top_win: PnlAmountDto;
    /**
     * Current unrealized profit across all tokens still held (all-time holdings, not date-filtered)
     */
    unrealized_profit: PnlAmountDto;
    /**
     * Percentage of sell transactions in the range that produced a positive gain
     */
    win_rate: number;
    /**
     * Average holding duration in seconds from first buy to sell (across sells in the range)
     */
    avg_duration_seconds: number;
    /**
     * Total number of sell transactions in the date range
     */
    total_trades: number;
    /**
     * Number of sell transactions that produced a positive gain
     */
    winning_trades: number;
};

