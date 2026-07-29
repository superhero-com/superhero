/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Pagination } from '../models/Pagination';
import type { RecheckRoomDto } from '../models/RecheckRoomDto';
import type { RequestChallengeDto } from '../models/RequestChallengeDto';
import type { RoomConfigViewDto } from '../models/RoomConfigViewDto';
import type { RoomMuteViewDto } from '../models/RoomMuteViewDto';
import type { RoomViewDto } from '../models/RoomViewDto';
import type { UpdateRoomMuteDto } from '../models/UpdateRoomMuteDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class RoomsService {
    /**
     * @returns RoomViewDto Refreshed caller view after the recheck. 200 with an empty body when the caller is not eligible / the sale address is not a gated room.
     * @throws ApiError
     */
    public static recheckRoomAccess({
        saleAddress,
        requestBody,
    }: {
        saleAddress: string,
        requestBody: RecheckRoomDto,
    }): CancelablePromise<RoomViewDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/rooms/{saleAddress}/recheck',
            path: {
                'saleAddress': saleAddress,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static listEligibleRooms({
        address,
        limit,
        page,
    }: {
        address: string,
        limit?: number,
        page?: number,
    }): CancelablePromise<Pagination> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/rooms',
            query: {
                'address': address,
                'limit': limit,
                'page': page,
            },
        });
    }
    /**
     * @returns RoomConfigViewDto
     * @throws ApiError
     */
    public static getRoomConfig(): CancelablePromise<RoomConfigViewDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/rooms/config',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static listRoomMembers({
        saleAddress,
        includePending,
        limit,
        page,
    }: {
        saleAddress: string,
        /**
         * When true, also include eligible-but-not-yet-added members (relay_state != added). Default false = readable (added) members only.
         */
        includePending?: boolean,
        limit?: number,
        page?: number,
    }): CancelablePromise<Pagination> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/rooms/{saleAddress}/members',
            path: {
                'saleAddress': saleAddress,
            },
            query: {
                'include_pending': includePending,
                'limit': limit,
                'page': page,
            },
        });
    }
    /**
     * @returns RoomMuteViewDto
     * @throws ApiError
     */
    public static getRoomMute({
        saleAddress,
        address,
    }: {
        saleAddress: string,
        address: string,
    }): CancelablePromise<RoomMuteViewDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/rooms/{saleAddress}/mute',
            path: {
                'saleAddress': saleAddress,
            },
            query: {
                'address': address,
            },
        });
    }
    /**
     * @returns RoomMuteViewDto
     * @throws ApiError
     */
    public static setRoomMute({
        saleAddress,
        requestBody,
    }: {
        saleAddress: string,
        requestBody: UpdateRoomMuteDto,
    }): CancelablePromise<RoomMuteViewDto> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/rooms/{saleAddress}/mute',
            path: {
                'saleAddress': saleAddress,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
    /**
     * @returns any
     * @throws ApiError
     */
    public static requestRoomMuteChallenge({
        saleAddress,
        requestBody,
    }: {
        saleAddress: string,
        requestBody: RequestChallengeDto,
    }): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/rooms/{saleAddress}/mute/challenge',
            path: {
                'saleAddress': saleAddress,
            },
            body: requestBody,
            mediaType: 'application/json',
        });
    }
}
