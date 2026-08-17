/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type RoomMemberViewDto = {
    member_address: string;
    /**
     * Resolved hex Nostr pubkey, or null until the holder links one.
     */
    member_pubkey: string | null;
    role: RoomMemberViewDto.role;
    relay_state: RoomMemberViewDto.relay_state;
    eligible: boolean;
};
export namespace RoomMemberViewDto {
    export enum role {
        MEMBER = 'member',
        ADMIN = 'admin',
    }
    export enum relay_state {
        PENDING_ADD = 'pending_add',
        ADDED = 'added',
        PENDING_REMOVE = 'pending_remove',
        REMOVED = 'removed',
    }
}

