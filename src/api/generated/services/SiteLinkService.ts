/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ClaimSiteLinkDto } from '../models/ClaimSiteLinkDto';
import type { SubmitSiteLinkDto } from '../models/SubmitSiteLinkDto';
import type { SubmitSiteUnlinkDto } from '../models/SubmitSiteUnlinkDto';
import type { UnclaimSiteLinkDto } from '../models/UnclaimSiteLinkDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SiteLinkService {
    /**
     * @returns any
     * @throws ApiError
     */
    public static siteLinkControllerClaim({
        requestBody,
    }: {
        requestBody: ClaimSiteLinkDto,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/address-links/site/claim',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static siteLinkControllerSubmit({
        requestBody,
    }: {
        requestBody: SubmitSiteLinkDto,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/address-links/site/submit',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static siteLinkControllerUnclaim({
        requestBody,
    }: {
        requestBody: UnclaimSiteLinkDto,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/address-links/site/unclaim',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static siteLinkControllerSubmitUnlink({
        requestBody,
    }: {
        requestBody: SubmitSiteUnlinkDto,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/address-links/site/unclaim/submit',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
