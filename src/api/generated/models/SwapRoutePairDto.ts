/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RouteLiquidityInfoDto } from './RouteLiquidityInfoDto';
export type SwapRoutePairDto = {
    /**
     * Pair contract address
     */
    address: string;
    /**
     * Whether the pair has usable (non-zero) reserves on both sides. Routes containing an unsynchronized pair are not quotable.
     */
    synchronized: boolean;
    /**
     * token0 contract address
     */
    token0: string;
    /**
     * token1 contract address
     */
    token1: string;
    liquidityInfo: RouteLiquidityInfoDto;
};

