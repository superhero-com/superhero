/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Pagination } from '../models/Pagination';
import type { PluginSyncState } from '../models/PluginSyncState';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class MdwPluginSyncStateService {
    /**
     * Get all pluginSyncStates
     * Retrieve a paginated list of all pluginSyncStates with optional sorting and filtering
     * @returns any
     * @throws ApiError
     */
    public static listAllpluginSyncStates({
        includes,
        limit,
        orderBy,
        orderDirection,
        page,
        pluginName,
    }: {
        includes: string,
        limit?: number,
        orderBy?: 'plugin_name' | 'version' | 'last_synced_height' | 'backward_synced_height' | 'live_synced_height' | 'start_from_height' | 'created_at' | 'updated_at',
        orderDirection?: 'ASC' | 'DESC',
        page?: number,
        /**
         * Filter by plugin_name
         */
        pluginName?: string,
    }): CancelablePromise<Pagination> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v2/mdw/plugin-sync-state',
            query: {
                'limit': limit,
                'order_by': orderBy,
                'order_direction': orderDirection,
                'includes': includes,
                'page': page,
                'plugin_name': pluginName,
            },
        });
    }
    /**
     * Get pluginSyncState by plugin_name
     * Retrieve a specific pluginSyncState by its plugin_name
     * @returns PluginSyncState pluginSyncState retrieved successfully
     * @throws ApiError
     */
    public static getpluginSyncStateByPluginName({
        pluginName,
        includes,
    }: {
        /**
         * pluginSyncState plugin_name
         */
        pluginName: string,
        includes: string,
    }): CancelablePromise<PluginSyncState> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v2/mdw/plugin-sync-state/{plugin_name}',
            path: {
                'plugin_name': pluginName,
            },
            query: {
                'includes': includes,
            },
        });
    }
}
