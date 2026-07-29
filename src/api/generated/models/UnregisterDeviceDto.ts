/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UnregisterDeviceDto = {
    address: string;
    expoPushToken: string;
    /**
     * Nonce returned by /devices/challenge
     */
    nonce: string;
    /**
     * Signature of the unlink challenge message
     */
    signature: string;
};

