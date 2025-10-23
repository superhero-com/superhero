/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DexTokenDto } from './DexTokenDto';
import type { PairSummaryDto } from './PairSummaryDto';
export type PairWithSummaryDto = {
    /**
     * Pair contract address
     */
    address: string;
    /**
     * First token in the pair
     */
    token0: DexTokenDto;
    /**
     * Second token in the pair
     */
    token1: DexTokenDto;
    /**
     * Number of transactions for this pair
     */
    transactions_count: number;
    /**
     * Reserve of the first token
     */
    reserve0: string;
    /**
     * Reserve of the second token
     */
    reserve1: string;
    /**
     * Total supply of the pair
     */
    total_supply: string;
    /**
     * Pair creation timestamp
     */
    created_at: string;
    /**
     * Pair summary data including volume and price changes
     */
    summary?: PairSummaryDto;
};

