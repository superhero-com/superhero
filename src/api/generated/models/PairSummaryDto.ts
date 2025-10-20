/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ChangeData } from './ChangeData';
import type { PriceDto } from './PriceDto';
export type PairSummaryDto = {
    /**
     * Pair contract address
     */
    address: string;
    /**
     * Token used for volume calculations
     */
    volume_token: string;
    /**
     * Token position in pair (0 or 1)
     */
    token_position: string;
    /**
     * Total volume data
     */
    total_volume: PriceDto;
    /**
     * Total locked value (liquidity) data
     */
    total_locked_value: PriceDto;
    /**
     * Data for different time periods (24h, 7d, 30d)
     */
    change: ChangeData;
};

