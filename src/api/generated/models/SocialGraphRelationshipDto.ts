/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SocialGraphRelationshipDto = {
    /**
     * `from` follows `to`.
     */
    a_follows_b: boolean;
    /**
     * `to` follows `from`.
     */
    b_follows_a: boolean;
    /**
     * `from` has blocked `to`.
     */
    a_blocked_b: boolean;
    /**
     * `to` has blocked `from`.
     */
    b_blocked_a: boolean;
};

