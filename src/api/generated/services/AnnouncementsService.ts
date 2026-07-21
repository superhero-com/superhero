/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnnouncementView } from '../models/AnnouncementView';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AnnouncementsService {
    /**
     * @returns AnnouncementView
     * @throws ApiError
     */
    public static announcementsControllerList({
        page = 1,
        limit = 20,
    }: {
        page?: number,
        limit?: number,
    }): CancelablePromise<Array<AnnouncementView>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/announcements',
            query: {
                'page': page,
                'limit': limit,
            },
        });
    }
}
