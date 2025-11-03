/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PriceChangeData } from './PriceChangeData';
import type { PriceDto } from './PriceDto';
export type PeriodData = {
    /**
     * Volume data for the period
     */
    volume: PriceDto;
    /**
     * Price change data for the period
     */
    price_change: PriceChangeData;
};

