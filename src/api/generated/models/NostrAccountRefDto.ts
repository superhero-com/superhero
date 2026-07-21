/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type NostrAccountRefDto = {
    /**
     * The matched nostr pubkey, normalized to lowercase 64-char hex.
     */
    nostr_pubkey: string;
    /**
     * The aeternity account that linked this nostr pubkey.
     */
    address: string;
    /**
     * The account's `.chain` name, if any.
     */
    chain_name: string | null;
};

