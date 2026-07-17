/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Pagination } from '../models/Pagination';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class GovernanceService {
    /**
     * Get all governance polls
     * Retrieve a paginated list of governance polls
     * @returns any
     * @throws ApiError
     */
    public static listGovernancePolls({
        limit,
        page,
    }: {
        limit?: number,
        page?: number,
    }): CancelablePromise<Pagination> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/governance/votes',
            query: {
                'limit': limit,
                'page': page,
            },
        });
    }
    /**
     * Get a governance poll with its votes
     * Retrieve a single governance poll by poll address with all associated votes
     * @returns any
     * @throws ApiError
     */
    public static getGovernancePollWithVotes({
        pollAddress,
    }: {
        /**
         * The poll address to retrieve votes for
         */
        pollAddress: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/governance/votes/{pollAddress}',
            path: {
                'pollAddress': pollAddress,
            },
        });
    }
    /**
     * Get all governance delegations
     * Retrieve a paginated list of governance delegations. By default, only valid (non-revoked) delegations are returned.
     * @returns any
     * @throws ApiError
     */
    public static listGovernanceDelegations({
        includeRevoked,
        limit,
        page,
    }: {
        /**
         * Include revoked delegations in the results
         */
        includeRevoked?: boolean,
        limit?: number,
        page?: number,
    }): CancelablePromise<Pagination> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/governance/delegations',
            query: {
                'includeRevoked': includeRevoked,
                'limit': limit,
                'page': page,
            },
        });
    }
    /**
     * Get delegation history for an account
     * Retrieve all delegation and revocation transactions for a specific account address, ordered chronologically
     * @returns any
     * @throws ApiError
     */
    public static getGovernanceDelegationHistory({
        accountAddress,
    }: {
        /**
         * The account address to retrieve delegation history for
         */
        accountAddress: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/governance/delegations/{accountAddress}',
            path: {
                'accountAddress': accountAddress,
            },
        });
    }
}
