/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateXPostingRecheckChallengeDto } from '../models/CreateXPostingRecheckChallengeDto';
import type { SubmitXPostingRecheckDto } from '../models/SubmitXPostingRecheckDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ProfileRewardsService {
    /**
     * Get X posting reward status for an address
     * @returns any
     * @throws ApiError
     */
    public static getXPostingRewardStatus({
        address,
    }: {
        address: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/profile/{address}/x-posting-reward',
            path: {
                'address': address,
            },
        });
    }
    /**
     * Create a wallet-signing challenge for X posting reward recheck
     * @returns any
     * @throws ApiError
     */
    public static createXPostingRewardRecheckChallenge({
        requestBody,
    }: {
        requestBody: CreateXPostingRecheckChallengeDto,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/profile/x-posting-reward/recheck-challenge',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Verify wallet ownership and run an on-demand X posting reward recheck
     * @returns any
     * @throws ApiError
     */
    public static recheckXPostingReward({
        address,
        requestBody,
    }: {
        address: string,
        requestBody: SubmitXPostingRecheckDto,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/profile/{address}/x-posting-reward/recheck',
            path: {
                'address': address,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * Verify wallet ownership and mint (or return) the unique X reward referral link
     * @returns any
     * @throws ApiError
     */
    public static createXRewardReferralLink({
        address,
        requestBody,
    }: {
        address: string,
        requestBody: SubmitXPostingRecheckDto,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/profile/{address}/x-reward/referral-link',
            path: {
                'address': address,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
