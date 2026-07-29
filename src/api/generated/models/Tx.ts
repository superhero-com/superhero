/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Tx = {
    hash: string;
    block_hash: string;
    block_height: number;
    version: number;
    encoded_tx?: string;
    micro_index: string;
    micro_time: string;
    signatures: Array<string>;
    type: string;
    payload?: string;
    contract_id?: string;
    function?: string;
    caller_id?: string;
    sender_id?: string;
    recipient_id?: string;
    raw?: Record<string, any>;
    data?: Record<string, any>;
    logs?: Record<string, any>;
    created_at: string;
};

