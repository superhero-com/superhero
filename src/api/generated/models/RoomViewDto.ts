/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type RoomViewDto = {
    /**
     * NIP-29 group id = the token sale address (verbatim, D3).
     */
    sale_address: string;
    /**
     * AEX9 token contract address.
     */
    token_address: string;
    symbol: string;
    is_private: boolean;
    /**
     * Minimum balance to be eligible, raw integer base units.
     */
    min_token_threshold: string;
    is_community: boolean;
    role: RoomViewDto.role;
    relay_state: RoomViewDto.relay_state;
    /**
     * Resolved hex Nostr pubkey, or null until the holder links one.
     */
    member_pubkey: string | null;
    /**
     * True iff the member is actually published on the relay (relay_state='added' AND member_pubkey set). When false, show the §16 'link your Nostr key' fallback.
     */
    readable: boolean;
};
export namespace RoomViewDto {
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

