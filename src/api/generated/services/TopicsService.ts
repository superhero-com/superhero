/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Pagination } from '../models/Pagination';
import type { Topic } from '../models/Topic';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class TopicsService {
    /**
     * Get all topics
     * Retrieve a paginated list of all topics with optional sorting and search functionality
     * @returns any
     * @throws ApiError
     */
    public static listAllTopics({
        orderBy,
        orderDirection,
        search,
        limit,
        page,
    }: {
        orderBy?: 'name' | 'post_count' | 'created_at',
        orderDirection?: 'ASC' | 'DESC',
        /**
         * Search term to filter topics by name
         */
        search?: string,
        limit?: number,
        page?: number,
    }): CancelablePromise<Pagination> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/topics',
            query: {
                'order_by': orderBy,
                'order_direction': orderDirection,
                'search': search,
                'limit': limit,
                'page': page,
            },
        });
    }
    /**
     * Get topic by ID
     * Retrieve a specific topic by its unique identifier
     * @returns Topic Topic retrieved successfully
     * @throws ApiError
     */
    public static getTopicById({
        id,
    }: {
        /**
         * Topic ID
         */
        id: string,
    }): CancelablePromise<Topic> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/topics/{id}',
            path: {
                'id': id,
            },
        });
    }
    /**
     * Get topic by name
     * Retrieve a specific topic by its name
     * @returns Topic Topic retrieved successfully
     * @throws ApiError
     */
    public static getTopicByName({
        name,
    }: {
        /**
         * Topic name
         */
        name: string,
    }): CancelablePromise<Topic> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/topics/name/{name}',
            path: {
                'name': name,
            },
        });
    }
    /**
     * Get popular topics
     * Retrieve the most popular topics by post count
     * @returns Topic Popular topics retrieved successfully
     * @throws ApiError
     */
    public static getPopularTopics(): CancelablePromise<Array<Topic>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/topics/popular/trending',
        });
    }
}
