/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PreferenceView } from '../models/PreferenceView';
import type { RegisterDeviceDto } from '../models/RegisterDeviceDto';
import type { RequestChallengeDto } from '../models/RequestChallengeDto';
import type { UnregisterDeviceDto } from '../models/UnregisterDeviceDto';
import type { UpdatePreferencesDto } from '../models/UpdatePreferencesDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class NotificationsService {
    /**
     * @returns any
     * @throws ApiError
     */
    public static devicesControllerRequestChallenge({
        requestBody,
    }: {
        requestBody: RequestChallengeDto,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/notifications/devices/challenge',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static devicesControllerRegister({
        requestBody,
    }: {
        requestBody: RegisterDeviceDto,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/notifications/devices',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static devicesControllerUnregister({
        requestBody,
    }: {
        requestBody: UnregisterDeviceDto,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/notifications/devices',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static preferencesControllerRequestChallenge({
        requestBody,
    }: {
        requestBody: RequestChallengeDto,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/notifications/preferences/challenge',
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns PreferenceView
     * @throws ApiError
     */
    public static preferencesControllerList({
        address,
    }: {
        address: string,
    }): CancelablePromise<Array<PreferenceView>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/notifications/{address}/preferences',
            path: {
                'address': address,
            },
        });
    }
    /**
     * @returns PreferenceView
     * @throws ApiError
     */
    public static preferencesControllerUpdate({
        address,
        requestBody,
    }: {
        address: string,
        requestBody: UpdatePreferencesDto,
    }): CancelablePromise<Array<PreferenceView>> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/notifications/{address}/preferences',
            path: {
                'address': address,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
