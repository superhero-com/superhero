/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TokenDto } from './TokenDto';
export type TopicDto = {
    /**
     * Unique identifier for the topic
     */
    id: string;
    /**
     * Name of the topic/hashtag
     */
    name: string;
    /**
     * Description of the topic
     */
    description: string | null;
    /**
     * Number of posts with this topic
     */
    post_count: number;
    /**
     * Associated token if topic name matches a token symbol
     */
    token: TokenDto | null;
    /**
     * Timestamp when the topic was created
     */
    created_at: string;
    /**
     * Timestamp when the topic was last updated
     */
    updated_at: string;
    /**
     * Version number
     */
    version: number;
};

