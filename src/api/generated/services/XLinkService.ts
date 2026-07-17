/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ClaimXLinkDto } from '../models/ClaimXLinkDto';
import type { SubmitXLinkDto } from '../models/SubmitXLinkDto';
import type { SubmitXUnlinkDto } from '../models/SubmitXUnlinkDto';
import type { UnclaimXLinkDto } from '../models/UnclaimXLinkDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class XLinkService {
    /**
     * @returns any
     * @throws ApiError
     */
    public static xLinkControllerClaim({
        requestBody,
    }: {
        requestBody: ClaimXLinkDto,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/address-links/x/claim',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static xLinkControllerSubmit({
        requestBody,
    }: {
        requestBody: SubmitXLinkDto,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/address-links/x/submit',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static xLinkControllerUnclaim({
        requestBody,
    }: {
        requestBody: UnclaimXLinkDto,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/address-links/x/unclaim',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static xLinkControllerSubmitUnlink({
        requestBody,
    }: {
        requestBody: SubmitXUnlinkDto,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/address-links/x/unclaim/submit',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
