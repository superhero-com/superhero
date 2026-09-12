/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type SocialGraphPrecheckDto = {
    /**
     * The write the client is about to sign.
     */
    action: SocialGraphPrecheckDto.action;
    /**
     * The signing caller.
     */
    from: string;
    /**
     * The target address.
     */
    to: string;
};
export namespace SocialGraphPrecheckDto {
    /**
     * The write the client is about to sign.
     */
    export enum action {
        FOLLOW = 'follow',
        UNFOLLOW = 'unfollow',
        BLOCK = 'block',
        UNBLOCK = 'unblock',
    }
}

