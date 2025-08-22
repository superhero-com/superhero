/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateAffiliationDto } from '../models/CreateAffiliationDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AffiliationsService {
    /**
     * Get invite link
     * @returns any
     * @throws ApiError
     */
    public static getJoinInviteInfo({
        code,
    }: {
        code: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/affiliations/invites/{code}',
            path: {
                'code': code,
            },
        });
    }
    /**
     * Get reward code
     * @returns any
     * @throws ApiError
     */
    public static getRewardCode({
        code,
        provider,
        accessCode,
    }: {
        code: string,
        provider: string,
        accessCode: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/affiliations/invites/{code}/{provider}/{access_code}',
            path: {
                'code': code,
                'provider': provider,
                'access_code': accessCode,
            },
        });
    }
    /**
     * Generate multiple invites link
     * @returns CreateAffiliationDto Affiliation created successfully
     * @throws ApiError
     */
    public static generateMultipleInviteLink({
        requestBody,
    }: {
        /**
         * Create affiliation
         */
        requestBody: CreateAffiliationDto,
    }): CancelablePromise<CreateAffiliationDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/affiliations',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static affiliationControllerRoot(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/affiliations/preview',
        });
    }
}
