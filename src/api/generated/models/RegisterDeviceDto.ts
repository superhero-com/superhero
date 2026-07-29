/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type RegisterDeviceDto = {
    address: string;
    expoPushToken: string;
    platform: RegisterDeviceDto.platform;
    appVersion?: string;
    deviceId?: string;
    /**
     * Nonce returned by /devices/challenge
     */
    nonce: string;
    /**
     * Signature of the challenge message (sg_... or hex)
     */
    signature: string;
};
export namespace RegisterDeviceDto {
    export enum platform {
        IOS = 'ios',
        ANDROID = 'android',
        WEB = 'web',
    }
}

