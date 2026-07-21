/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type RoomMuteViewDto = {
    /**
     * Per-room mute for this (address, sale_address). Default false (no row = not muted).
     */
    muted: boolean;
    /**
     * Mute-all for room messages (the type-level `room-messages` switch). True iff that type is disabled. Suppresses EVERY room's message pushes.
     */
    mute_all: boolean;
};

