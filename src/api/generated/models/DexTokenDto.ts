/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DexTokenSummaryDto } from './DexTokenSummaryDto';
import type { PriceDto } from './PriceDto';
export type DexTokenDto = {
    /**
     * Token contract address
     */
    address: string;
    /**
     * Token name
     */
    name: string;
    /**
     * Token symbol
     */
    symbol: string;
    /**
     * Token decimals
     */
    decimals: number;
    /**
     * Number of pairs this token is part of
     */
    pairs_count: number;
    /**
     * Token creation timestamp
     */
    created_at: string;
    /**
     * Token is AE
     */
    is_ae: boolean;
    /**
     * Price Data
     */
    price: PriceDto;
    /**
     * Aggregated volume and price change summary across all pools for this token
     */
    summary: DexTokenSummaryDto | null;
};

