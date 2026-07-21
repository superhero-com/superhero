/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ClaimPreferredLinkDto } from '../models/ClaimPreferredLinkDto';
import type { SubmitPreferredLinkDto } from '../models/SubmitPreferredLinkDto';
import type { SubmitPreferredUnlinkDto } from '../models/SubmitPreferredUnlinkDto';
import type { UnclaimPreferredLinkDto } from '../models/UnclaimPreferredLinkDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class PreferredLinkService {
    /**
     * @returns any
     * @throws ApiError
     */
    public static preferredLinkControllerClaim({
        requestBody,
    }: {
        requestBody: ClaimPreferredLinkDto,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/address-links/prefered-aens-name/claim',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static preferredLinkControllerSubmit({
        requestBody,
    }: {
        requestBody: SubmitPreferredLinkDto,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/address-links/prefered-aens-name/submit',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static preferredLinkControllerUnclaim({
        requestBody,
    }: {
        requestBody: UnclaimPreferredLinkDto,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/address-links/prefered-aens-name/unclaim',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static preferredLinkControllerSubmitUnlink({
        requestBody,
    }: {
        requestBody: SubmitPreferredUnlinkDto,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/address-links/prefered-aens-name/unclaim/submit',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
