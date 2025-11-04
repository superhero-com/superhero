/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PriceDto } from './PriceDto';
export type PerformancePeriodDto = {
    current: PriceDto;
    current_date: string;
    current_change: number;
    current_change_percent: number;
    current_change_direction: PerformancePeriodDto.current_change_direction;
    high: PriceDto;
    high_date: string;
    low: PriceDto;
    low_date: string;
    last_updated: string;
};
export namespace PerformancePeriodDto {
    export enum current_change_direction {
        UP = 'up',
        DOWN = 'down',
        NEUTRAL = 'neutral',
    }
}

