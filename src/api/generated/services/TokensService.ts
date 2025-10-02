/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Pagination } from '../models/Pagination';
import type { TokenDto } from '@/api/generated/models/TokenDto';
import type { TokenPriceMovementDto } from '../models/TokenPriceMovementDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class TokensService {
    /**
     * @returns any
     * @throws ApiError
     */
    public static listAll({
        orderBy,
        orderDirection,
        collection,
        limit,
        page,
        ownerAddress,
        creatorAddress,
        factoryAddress,
        search,
    }: {
        orderBy?: 'name' | 'price' | 'market_cap' | 'created_at' | 'holders_count',
        orderDirection?: 'ASC' | 'DESC',
        collection?: 'all' | 'word' | 'number',
        limit?: number,
        page?: number,
        ownerAddress?: string,
        creatorAddress?: string,
        factoryAddress?: string,
        search?: string,
    }): CancelablePromise<Pagination> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/tokens',
            query: {
                'order_by': orderBy,
                'order_direction': orderDirection,
                'collection': collection,
                'limit': limit,
                'page': page,
                'owner_address': ownerAddress,
                'creator_address': creatorAddress,
                'factory_address': factoryAddress,
                'search': search,
            },
        });
    }
    /**
     * @returns TokenDto
     * @throws ApiError
     */
    public static findByAddress({
        address,
    }: {
        /**
         * Token address or name
         */
        address: string,
    }): CancelablePromise<TokenDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/tokens/{address}',
            path: {
                'address': address,
            },
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static listTokenHolders({
        address,
        limit,
        page,
    }: {
        /**
         * Token address or name
         */
        address: string,
        limit?: number,
        page?: number,
    }): CancelablePromise<Pagination> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/tokens/{address}/holders',
            path: {
                'address': address,
            },
            query: {
                'limit': limit,
                'page': page,
            },
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static listTokenRankings({
        address,
        limit,
        page,
    }: {
        /**
         * Token address or name
         */
        address: string,
        limit?: number,
        page?: number,
    }): CancelablePromise<Pagination> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/tokens/{address}/rankings',
            path: {
                'address': address,
            },
            query: {
                'limit': limit,
                'page': page,
            },
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static getTokenScore({
        address,
    }: {
        /**
         * Token address or name
         */
        address: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/tokens/{address}/score',
            path: {
                'address': address,
            },
        });
    }
    /**
     * @returns TokenPriceMovementDto
     * @throws ApiError
     */
    public static performance({
        address,
    }: {
        /**
         * Token address or name
         */
        address: string,
    }): CancelablePromise<TokenPriceMovementDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/tokens/{address}/performance',
            path: {
                'address': address,
            },
        });
    }
}
