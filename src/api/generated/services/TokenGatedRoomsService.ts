/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class TokenGatedRoomsService {
    /**
     * @returns any TGR pipeline metrics: queue depth/lag, relay health, relay_state + nostr_room_state distributions, Postgres-vs-relay drift, reconcile staleness, backfill progress, and an overallStatus. The relay/counter fields are worker-local (processLocal=false when served from main).
     * @throws ApiError
     */
    public static tgrMetricsControllerGetMetrics(): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/tgr/metrics',
        });
    }
}
