/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LiquidityInfoDto } from './LiquidityInfoDto';
import type { PairDto } from './PairDto';
import type { SwapInfoDto } from './SwapInfoDto';
export type PairTransactionDto = {
    /**
     * Transaction hash
     */
    tx_hash: string;
    /**
     * Account that submitted the transaction
     */
    account_address: string | null;
    /**
     * Block height at which the transaction was included
     */
    block_height: number;
    /**
     * Associated pair
     */
    pair: PairDto;
    /**
     * Transaction type (e.g., swap, add_liquidity, remove_liquidity)
     */
    tx_type: string;
    /**
     * Reserve of token0 after the transaction
     */
    reserve0: string;
    /**
     * Reserve of token1 after the transaction
     */
    reserve1: string;
    /**
     * Price of token0 quoted in token1 (reserve0 / reserve1)
     */
    ratio0: string;
    /**
     * Price of token1 quoted in token0 (reserve1 / reserve0)
     */
    ratio1: string;
    /**
     * Total supply of the pair LP token after the transaction
     */
    total_supply: string;
    /**
     * Traded volume of token0 (sum of in/out amounts) for swaps; 0 for liquidity operations
     */
    volume0: string;
    /**
     * Traded volume of token1 (sum of in/out amounts) for swaps; 0 for liquidity operations
     */
    volume1: string;
    /**
     * Market cap denominated in token0
     */
    market_cap0: string;
    /**
     * Market cap denominated in token1
     */
    market_cap1: string;
    /**
     * Pool market cap
     */
    market_cap: string;
    /**
     * Swap event details (present for swap transactions)
     */
    swap_info: SwapInfoDto | null;
    /**
     * Liquidity event details (present for add/remove liquidity transactions)
     */
    pair_mint_info: LiquidityInfoDto | null;
    /**
     * Transaction creation timestamp
     */
    created_at: string;
};

