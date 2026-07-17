/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UpdateRoomMuteDto = {
    address: string;
    /**
     * Nonce returned by POST /rooms/:saleAddress/mute/challenge
     */
    nonce: string;
    /**
     * Signature of the room-mute message (sg_... or hex)
     */
    signature: string;
    /**
     * Mute this specific room for this address.
     */
    muted: boolean;
    /**
     * Optional: also toggle mute-all for room messages (the type-level `room-messages` switch). Omit to leave the type-level switch untouched.
     */
    mute_all?: boolean;
};

