/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Pagination } from '../models/Pagination';
import type { SyncState } from '../models/SyncState';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class MdwSyncStateService {
    /**
     * Get all syncStates
     * Retrieve a paginated list of all syncStates with optional sorting and filtering
     * @returns any
     * @throws ApiError
     */
    public static listAllsyncStates({
        includes,
        limit,
        orderBy,
        orderDirection,
        page,
        id,
    }: {
        includes: string,
        limit?: number,
        orderBy?: 'id' | 'last_synced_height' | 'tip_height' | 'is_bulk_mode' | 'backward_synced_height' | 'live_synced_height' | 'created_at' | 'updated_at',
        orderDirection?: 'ASC' | 'DESC',
        page?: number,
        /**
         * Filter by id
         */
        id?: string,
    }): CancelablePromise<Pagination> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v2/mdw/sync-state',
            query: {
                'limit': limit,
                'order_by': orderBy,
                'order_direction': orderDirection,
                'includes': includes,
                'page': page,
                'id': id,
            },
        });
    }
    /**
     * Get syncState by id
     * Retrieve a specific syncState by its id
     * @returns SyncState syncState retrieved successfully
     * @throws ApiError
     */
    public static getsyncStateById({
        id,
        includes,
    }: {
        /**
         * syncState id
         */
        id: string,
        includes: string,
    }): CancelablePromise<SyncState> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v2/mdw/sync-state/{id}',
            path: {
                'id': id,
            },
            query: {
                'includes': includes,
            },
        });
    }
}
