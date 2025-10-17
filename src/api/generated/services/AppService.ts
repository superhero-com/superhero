/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AppService {
    /**
     * @returns any
     * @throws ApiError
     */
    public static getApiStats(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/stats',
        });
    }
    /**
     * @deprecated
     * @returns any
     * @throws ApiError
     */
    public static getContracts(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/contracts',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static getFactory(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/factory',
        });
    }
}
