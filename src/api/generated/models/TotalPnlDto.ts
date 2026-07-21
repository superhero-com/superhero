/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PnlAmountDto } from './PnlAmountDto';
export type TotalPnlDto = {
    /**
     * Total PNL percentage
     */
    percentage: number;
    /**
     * Total amount invested
     */
    invested: PnlAmountDto;
    /**
     * Current total value
     */
    current_value: PnlAmountDto;
    /**
     * Total gain/loss
     */
    gain: PnlAmountDto;
};

