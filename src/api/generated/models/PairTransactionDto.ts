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
     * Transaction creation timestamp
     */
    created_at: string;
};

