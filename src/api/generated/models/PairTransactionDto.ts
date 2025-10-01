/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PairDto } from './PairDto';
export type PairTransactionDto = {
    /**
     * Transaction hash
     */
    tx_hash: string;
    /**
     * Associated pair
     */
    pair: PairDto;
    /**
     * Transaction type (e.g., swap, add_liquidity, remove_liquidity)
     */
    tx_type: string;
    /**
     * Reserve of token0
     */
    reserve0: string;
    /**
     * Reserve of token1
     */
    reserve1: string;
    /**
     * Ratio of token0
     */
    ratio0: string;
    /**
     * Ratio of token1
     */
    ratio1: string;
    /**
     * Total supply
     */
    total_supply: string;
    /**
     * Volume of token0
     */
    volume0: string;
    /**
     * Volume of token1
     */
    volume1: string;
    /**
     * Market cap of token0
     */
    market_cap0: string;
    /**
     * Market cap of token1
     */
    market_cap1: string;
    /**
     * Total market cap
     */
    market_cap: string;
    /**
     * Swap information
     */
    swap_info: {
        amount0In: string;
        amount1In: string;
        amount0Out: string;
        amount1Out: string;
    } | null;

    /**
     * Pair mint information
     */
    pair_mint_info: {
        type: string;
        amount0: string;
        amount1: string;
    } | null;
    /**
     * Transaction creation timestamp
     */
    created_at: string;
};

