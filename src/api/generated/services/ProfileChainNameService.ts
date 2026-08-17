/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateChainNameChallengeDto } from '../models/CreateChainNameChallengeDto';
import type { RequestChainNameDto } from '../models/RequestChainNameDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ProfileChainNameService {
    /**
     * Create a wallet-signing challenge for sponsored chain name claims
     * @returns any
     * @throws ApiError
     */
    public static createChainNameChallenge({
        requestBody,
    }: {
        requestBody: CreateChainNameChallengeDto,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/profile/chain-name/challenge',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Verify wallet ownership and request a sponsored AENS chain name registration.
     * @returns any
     * @throws ApiError
     */
    public static requestChainName({
        requestBody,
    }: {
        requestBody: RequestChainNameDto,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/profile/chain-name/claim',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Check whether the sponsor account has enough balance to fund a chain name claim
     * @returns any
     * @throws ApiError
     */
    public static checkChainNameSponsorship({
        name,
    }: {
        /**
         * Desired chain name without the .chain suffix (AENS rules, at least 13 characters)
         */
        name: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/profile/chain-name/sponsorship/{name}',
            path: {
                'name': name,
            },
        });
    }
    /**
     * Get the status of a sponsored chain name claim for an address
     * @returns any
     * @throws ApiError
     */
    public static getChainNameClaimStatus({
        address,
    }: {
        address: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/profile/{address}/chain-name-claim',
            path: {
                'address': address,
            },
        });
    }
}
