/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CollectionInfoDto } from './CollectionInfoDto';
import type { TrendPerformanceSummaryDto } from './TrendPerformanceSummaryDto';
export type PostTrendMentionDto = {
    /**
     * Trend name extracted from #trendName
     */
    name: string;
    /**
     * Token sale address, if resolved
     */
    sale_address: string | null;
    /**
     * Collection metadata for the mentioned token's collection, or null when the token is unresolved / has no known collection.
     */
    collection_info: CollectionInfoDto | null;
    /**
     * Performance summary for 24h and 7d windows
     */
    performance: TrendPerformanceSummaryDto | null;
};

