/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import { ChangeData } from './ChangeData';
import type { DexTokenDto } from './DexTokenDto';
import { PriceDto } from './PriceDto';
export type PairDto = {
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
     * Summary statistics for the pair
     */
    summary: {
        /**
         * Address of the trading pair
         */
        pair_address: string,
        /**
         * Volume token identifier
         */
        volume_token: string,
        /**
         * Position of the token in the pair (0 or 1)
         */
        token_position: string,
        /**
         * Total trading volume with price data
         */
        total_volume: PriceDto,
        /**
         * Price and volume change data over time
         */
        change: ChangeData
    }
};

