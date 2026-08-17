/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ClaimBioLinkDto } from '../models/ClaimBioLinkDto';
import type { SubmitBioLinkDto } from '../models/SubmitBioLinkDto';
import type { SubmitBioUnlinkDto } from '../models/SubmitBioUnlinkDto';
import type { UnclaimBioLinkDto } from '../models/UnclaimBioLinkDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class BioLinkService {
    /**
     * @returns any
     * @throws ApiError
     */
    public static bioLinkControllerClaim({
        requestBody,
    }: {
        requestBody: ClaimBioLinkDto,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/address-links/bio/claim',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static bioLinkControllerSubmit({
        requestBody,
    }: {
        requestBody: SubmitBioLinkDto,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/address-links/bio/submit',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static bioLinkControllerUnclaim({
        requestBody,
    }: {
        requestBody: UnclaimBioLinkDto,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/address-links/bio/unclaim',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static bioLinkControllerSubmitUnlink({
        requestBody,
    }: {
        requestBody: SubmitBioUnlinkDto,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/address-links/bio/unclaim/submit',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
