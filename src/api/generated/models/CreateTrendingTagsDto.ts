/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TrendingTagItemDto } from './TrendingTagItemDto';
export type CreateTrendingTagsDto = {
    /**
     * The provider source (e.g., x, facebook, github)
     */
    provider: string;
    /**
     * Array of trending tag items
     */
    items: Array<TrendingTagItemDto>;
};

