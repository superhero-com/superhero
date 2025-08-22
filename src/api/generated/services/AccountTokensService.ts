/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Pagination } from '../models/Pagination';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AccountTokensService {
    /**
     * @returns any
     * @throws ApiError
     */
    public static listTokenHolders({
        address,
        orderBy,
        orderDirection,
        limit,
        page,
        ownerAddress,
        creatorAddress,
        factoryAddress,
        search,
    }: {
        /**
         * Account Address
         */
        address: string,
        orderBy?: 'balance',
        orderDirection?: 'ASC' | 'DESC',
        limit?: number,
        page?: number,
        ownerAddress?: string,
        creatorAddress?: string,
        factoryAddress?: string,
        search?: string,
    }): CancelablePromise<Pagination> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/accounts/{address}/tokens',
            path: {
                'address': address,
            },
            query: {
                'order_by': orderBy,
                'order_direction': orderDirection,
                'limit': limit,
                'page': page,
                'owner_address': ownerAddress,
                'creator_address': creatorAddress,
                'factory_address': factoryAddress,
                'search': search,
            },
        });
    }
}
