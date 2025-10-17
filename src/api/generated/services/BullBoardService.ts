/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class BullBoardService {
    /**
     * @returns any
     * @throws ApiError
     */
    public static bullBoardControllerAdminGet(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/bull-board',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static bullBoardControllerAdminPost(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/bull-board',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static bullBoardControllerAdminPut(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/bull-board',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static bullBoardControllerAdminDelete(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/bull-board',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static bullBoardControllerAdminPatch(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/bull-board',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static bullBoardControllerAdminOptions(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'OPTIONS',
            url: '/api/bull-board',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static bullBoardControllerAdminHead(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'HEAD',
            url: '/api/bull-board',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static bullBoardControllerAdminGet1(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/bull-board/{path}',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static bullBoardControllerAdminPost1(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/bull-board/{path}',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static bullBoardControllerAdminPut1(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/bull-board/{path}',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static bullBoardControllerAdminDelete1(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/bull-board/{path}',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static bullBoardControllerAdminPatch1(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'PATCH',
            url: '/api/bull-board/{path}',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static bullBoardControllerAdminOptions1(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'OPTIONS',
            url: '/api/bull-board/{path}',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static bullBoardControllerAdminHead1(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'HEAD',
            url: '/api/bull-board/{path}',
        });
    }
}
