/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type RequestChainNameDto = {
    /**
     * Account address (ak_...)
     */
    address: string;
    /**
     * Desired chain name without the .chain suffix (AENS rules, at least 13 characters).
     */
    name: string;
    /**
     * Challenge nonce returned by the challenge endpoint
     */
    challenge_nonce: string;
    /**
     * Challenge expiry timestamp returned by the challenge endpoint
     */
    challenge_expires_at: string;
    /**
     * Wallet signature for the returned challenge message, as hex or sg_ string
     */
    signature_hex: string;
};

