/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SocialGraphConfigDto } from '../models/SocialGraphConfigDto';
import type { SocialGraphPrecheckDto } from '../models/SocialGraphPrecheckDto';
import type { SocialGraphRelationshipDto } from '../models/SocialGraphRelationshipDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class SocialGraphService {
    /**
     * Pair-wise follow/block relationship between two addresses
     * @returns SocialGraphRelationshipDto
     * @throws ApiError
     */
    public static getSocialGraphRelationship({
        from,
        to,
    }: {
        from: string,
        to: string,
    }): CancelablePromise<SocialGraphRelationshipDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/social-graph/relationship',
            query: {
                'from': from,
                'to': to,
            },
            errors: {
                400: `Invalid address.`,
            },
        });
    }
    /**
     * Contract caps: max_following, max_blocked, follow_cooldown
     * @returns SocialGraphConfigDto
     * @throws ApiError
     */
    public static getSocialGraphConfig(): CancelablePromise<SocialGraphConfigDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/social-graph/config',
            errors: {
                503: `Contract not configured.`,
            },
        });
    }
    /**
     * Advisory precheck: would this follow/unfollow/block/unblock succeed on chain?
     * @returns void
     * @throws ApiError
     */
    public static precheckSocialGraphAction({
        requestBody,
    }: {
        requestBody: SocialGraphPrecheckDto,
    }): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/social-graph/precheck',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Invalid action or address.`,
                403: `BLOCKED — the target has blocked the caller.`,
                409: `Stale-state or cap: ALREADY_FOLLOWING, NOT_FOLLOWING, ALREADY_BLOCKED, NOT_BLOCKED, CANNOT_FOLLOW_SELF, CANNOT_BLOCK_SELF, BLOCKED_BY_SELF, MAX_FOLLOWING_REACHED, MAX_BLOCKED_REACHED.`,
                429: `FOLLOW_COOLDOWN (unreachable while follow_cooldown = 0).`,
            },
        });
    }
}
