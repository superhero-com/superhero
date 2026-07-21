/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type LiquidityInfoDto = {
    /**
     * Liquidity operation type
     */
    type: LiquidityInfoDto.type;
    /**
     * Amount of token0 added/removed
     */
    amount0: string;
    /**
     * Amount of token1 added/removed
     */
    amount1: string;
};
export namespace LiquidityInfoDto {
    /**
     * Liquidity operation type
     */
    export enum type {
        PAIR_MINT = 'PairMint',
        PAIR_BURN = 'PairBurn',
    }
}

