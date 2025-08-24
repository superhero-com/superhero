/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PriceDto } from './PriceDto';
export type PriceMovementDto = {
    current: PriceDto;
    current_date: string;
    current_change: number;
    current_change_percent: number;
    current_change_direction: string;
    high: PriceDto;
    high_date: string;
    high_change: number;
    high_change_percent: number;
    high_change_direction: string;
    low: PriceDto;
    low_date: string;
    low_change: number;
    low_change_percent: number;
    low_change_direction: string;
    last_updated: string;
};

