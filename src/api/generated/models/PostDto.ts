/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PostSenderDto } from './PostSenderDto';
import type { PostTrendMentionDto } from './PostTrendMentionDto';
export type PostDto = {
    /**
     * Unique identifier for the post
     */
    id: string;
    /**
     * Transaction hash associated with the post
     */
    tx_hash: string;
    /**
     * Transaction arguments as JSON array
     */
    tx_args: Array<Record<string, any>>;
    /**
     * Address of the post sender/creator
     */
    sender_address: string;
    /**
     * Minimal sender profile info
     */
    sender: PostSenderDto;
    /**
     * Address of the smart contract
     */
    contract_address: string;
    /**
     * Type of the post/transaction
     */
    type: string;
    /**
     * Main content of the post
     */
    content: string;
    /**
     * Trend mentions extracted from #trendName in content
     */
    trend_mentions?: Array<PostTrendMentionDto>;
    /**
     * Array of media URLs associated with the post
     */
    media: Array<string>;
    /**
     * Total number of comments on this post
     */
    total_comments: number;
    /**
     * Timestamp when the post was created
     */
    created_at: string;
};

