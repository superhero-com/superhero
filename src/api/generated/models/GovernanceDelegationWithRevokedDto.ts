/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type GovernanceDelegationWithRevokedDto = {
    /**
     * Transaction hash
     */
    hash: string;
    /**
     * Block hash
     */
    block_hash: string;
    /**
     * Block height
     */
    block_height: number;
    /**
     * Caller ID
     */
    caller_id: string | null;
    /**
     * Function name
     */
    function: string;
    /**
     * Created at timestamp
     */
    created_at: string;
    /**
     * Micro time
     */
    micro_time: string;
    /**
     * Governance decoded data
     */
    data: Record<string, any>;
    /**
     * Plugin version
     */
    _version: number;
    /**
     * Delegator address
     */
    delegator: string;
    /**
     * Delegatee address
     */
    delegatee: string;
    /**
     * Whether this delegation has been revoked
     */
    revoked: boolean;
    /**
     * Revocation transaction hash if revoked
     */
    revoked_hash: string | null;
    /**
     * Revocation block height if revoked
     */
    revoked_block_height: number | null;
    /**
     * Revocation timestamp if revoked
     */
    revoked_at: string | null;
};

