/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AccountsService {
    /**
     * @returns any
     * @throws ApiError
     */
    public static listAll({
        orderBy,
        orderDirection,
        limit,
        page,
    }: {
        orderBy?: 'total_volume' | 'total_tx_count' | 'total_buy_tx_count' | 'total_sell_tx_count' | 'total_created_tokens' | 'total_invitation_count' | 'total_claimed_invitation_count' | 'total_revoked_invitation_count' | 'created_at',
        orderDirection?: 'ASC' | 'DESC',
        limit?: number,
        page?: number,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/accounts',
            query: {
                'order_by': orderBy,
                'order_direction': orderDirection,
                'limit': limit,
                'page': page,
            },
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static getAccount({
        address,
    }: {
        address: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/accounts/{address}',
            path: {
                'address': address,
            },
        });
    }
}
