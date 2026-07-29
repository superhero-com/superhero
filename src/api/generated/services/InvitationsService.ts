/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class InvitationsService {
    /**
     * @returns any
     * @throws ApiError
     */
    public static listAll({
        orderBy,
        orderDirection,
        inviter,
        limit,
        page,
    }: {
        orderBy?: 'amount' | 'created_at',
        orderDirection?: 'ASC' | 'DESC',
        /**
         * Filter to invitations sent by this address; each item includes its claim status (claimed, claimer_address, claimed_at, claim_tx_hash) so callers no longer need a per-invitee middleware lookup.
         */
        inviter?: string,
        limit?: number,
        page?: number,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/invitations',
            query: {
                'order_by': orderBy,
                'order_direction': orderDirection,
                'inviter': inviter,
                'limit': limit,
                'page': page,
            },
        });
    }
}
