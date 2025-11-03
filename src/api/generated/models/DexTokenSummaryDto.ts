/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { DexTokenChangeData } from './DexTokenChangeData';
import type { PriceDto } from './PriceDto';
export type DexTokenSummaryDto = {
    /**
     * Token contract address
     */
    address: string;
    /**
     * Total volume data
     */
    total_volume: PriceDto;
    /**
     * Data for different time periods (24h, 7d, 30d)
     */
    change: DexTokenChangeData | null;
};

