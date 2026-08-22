/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SocialGraphConfigDto = {
    /**
     * Max concurrent following list size.
     */
    max_following: number;
    /**
     * Max concurrent blocked list size.
     */
    max_blocked: number;
    /**
     * Blocks between consecutive follows, in blocks. 0 = no limit.
     */
    follow_cooldown: number;
    /**
     * The indexed contract address.
     */
    contract_address: string;
};

