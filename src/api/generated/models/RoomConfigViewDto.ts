/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type RoomConfigViewDto = {
    /**
     * groups_relay websocket URL (= TG_RELAY_URL).
     */
    relay_url: string;
    /**
     * Relay-admin (bot) public key in hex, derived from TG_BOT_NSEC. The nsec is never exposed.
     */
    admin_pubkey: string;
};

