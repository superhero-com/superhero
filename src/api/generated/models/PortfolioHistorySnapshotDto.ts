/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TotalPnlDto } from './TotalPnlDto';
export type PortfolioHistorySnapshotDto = {
    /**
     * Timestamp of the snapshot
     */
    timestamp: string;
    /**
     * Block height at the time of the snapshot
     */
    block_height: number;
    /**
     * Total value of tokens in AE
     */
    tokens_value_ae: number;
    /**
     * Total value of tokens in USD
     */
    tokens_value_usd: number;
    /**
     * Total portfolio value in AE (AE balance + tokens value)
     */
    total_value_ae: number;
    /**
     * Total portfolio value in USD
     */
    total_value_usd: number;
    /**
     * AE balance at the time of the snapshot
     */
    ae_balance: number;
    /**
     * USD value of AE balance
     */
    usd_balance: number;
    /**
     * AE price in USD at the time of the snapshot
     */
    ae_price: number;
    /**
     * Version of the snapshot format
     */
    version: number;
    /**
     * Total PNL across all tokens (included if requested)
     */
    total_pnl?: TotalPnlDto;
    /**
     * PNL breakdown per token, keyed by token sale_address. Only returned by the dedicated /portfolio/tokens/history endpoint.
     */
    tokens_pnl?: Record<string, any>;
};

