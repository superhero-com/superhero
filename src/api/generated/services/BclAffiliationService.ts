/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class BclAffiliationService {
    /**
     * @returns any
     * @throws ApiError
     */
    public static getBclAffiliationAnalytics({
        startDate,
        endDate,
    }: {
        startDate?: string,
        endDate?: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/bcl-affiliation/analytics',
            query: {
                'start_date': startDate,
                'end_date': endDate,
            },
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static getBclAffiliationTopInviters({
        startDate,
        endDate,
        limit,
    }: {
        startDate?: string,
        endDate?: string,
        limit?: number,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/bcl-affiliation/analytics/top-inviters',
            query: {
                'start_date': startDate,
                'end_date': endDate,
                'limit': limit,
            },
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static getBclAffiliationXVerificationAnalytics({
        startDate,
        endDate,
    }: {
        startDate?: string,
        endDate?: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/bcl-affiliation/analytics/x-verification',
            query: {
                'start_date': startDate,
                'end_date': endDate,
            },
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static getBclAffiliationXInviteUsageAnalytics({
        startDate,
        endDate,
    }: {
        startDate?: string,
        endDate?: string,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/bcl-affiliation/analytics/x-invite',
            query: {
                'start_date': startDate,
                'end_date': endDate,
            },
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static previewBclAffiliationAnalytics(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/bcl-affiliation/analytics/preview',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static previewBclAffiliationXVerificationAnalytics(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/bcl-affiliation/analytics/x-verification/preview',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static previewBclAffiliationXInviteAnalytics(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/bcl-affiliation/analytics/x-invite/preview',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static getBclAffiliationTreeData(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/bcl-affiliation/tree',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static previewBclAffiliationTree(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/bcl-affiliation/tree/preview',
        });
    }
}
