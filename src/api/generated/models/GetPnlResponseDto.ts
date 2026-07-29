/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TotalPnlDto } from './TotalPnlDto';
export type GetPnlResponseDto = {
    /**
     * Block height used for the calculation
     */
    block_height: number;
    /**
     * Total PNL across all tokens
     */
    total_pnl: TotalPnlDto;
    /**
     * PNL breakdown per token (keyed by sale_address)
     */
    tokens_pnl: Record<string, Record<string, any>>;
};

