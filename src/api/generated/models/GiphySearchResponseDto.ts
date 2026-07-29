/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { GiphyGifDto } from './GiphyGifDto';
export type GiphySearchResponseDto = {
    results: Array<GiphyGifDto>;
    totalCount: number;
    /**
     * Offset to pass for the next page
     */
    nextOffset: number;
    hasMore: boolean;
};

