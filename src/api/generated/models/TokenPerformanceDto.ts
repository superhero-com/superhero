/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PerformancePeriodDto } from './PerformancePeriodDto';
export type TokenPerformanceDto = {
    sale_address: string;
    past_24h: PerformancePeriodDto | null;
    past_7d: PerformancePeriodDto | null;
    past_30d: PerformancePeriodDto | null;
    all_time: PerformancePeriodDto | null;
};

