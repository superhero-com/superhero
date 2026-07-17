/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ClaimNostrLinkDto } from '../models/ClaimNostrLinkDto';
import type { SubmitNostrLinkDto } from '../models/SubmitNostrLinkDto';
import type { SubmitNostrUnlinkDto } from '../models/SubmitNostrUnlinkDto';
import type { UnclaimNostrLinkDto } from '../models/UnclaimNostrLinkDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class NostrLinkService {
    /**
     * @returns any
     * @throws ApiError
     */
    public static nostrLinkControllerClaim({
        requestBody,
    }: {
        requestBody: ClaimNostrLinkDto,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/address-links/nostr/claim',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static nostrLinkControllerSubmit({
        requestBody,
    }: {
        requestBody: SubmitNostrLinkDto,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/address-links/nostr/submit',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static nostrLinkControllerUnclaim({
        requestBody,
    }: {
        requestBody: UnclaimNostrLinkDto,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/address-links/nostr/unclaim',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static nostrLinkControllerSubmitUnlink({
        requestBody,
    }: {
        requestBody: SubmitNostrUnlinkDto,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/address-links/nostr/unclaim/submit',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
