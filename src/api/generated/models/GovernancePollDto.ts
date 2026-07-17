/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type GovernancePollDto = {
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
     * Plugin version
     */
    _version: number;
    /**
     * Poll author address
     */
    author: string | null;
    /**
     * Poll metadata
     */
    metadata: {
        link?: string;
        title?: string;
        spec_ref?: Array<number>;
        description?: string;
    } | null;
    /**
     * Poll sequence ID
     */
    poll_seq_id: string | null;
    /**
     * Close height
     */
    close_height: number | null;
    /**
     * Poll address
     */
    poll_address: string;
    /**
     * Vote options
     */
    vote_options: Array<{
        key?: number;
        val?: string;
    }> | null;
    /**
     * Create height
     */
    create_height: number | null;
    /**
     * Close at height
     */
    close_at_height: number | null;
    /**
     * Total number of votes (including vote and revoke_vote transactions)
     */
    votes_count: number;
    /**
     * Total number of revoked votes
     */
    votes_revoked_count: number;
    /**
     * Vote counts per option (maps option key to vote count)
     */
    votes_count_by_option: Record<string, number> | null;
};

