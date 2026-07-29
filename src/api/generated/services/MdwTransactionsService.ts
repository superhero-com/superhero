/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Pagination } from '../models/Pagination';
import type { Tx } from '../models/Tx';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class MdwTransactionsService {
    /**
     * Get all txs
     * Retrieve a paginated list of all txs with optional sorting and filtering
     * @returns any
     * @throws ApiError
     */
    public static listAlltxs({
        limit,
        orderBy,
        orderDirection,
        includes,
        page,
        type,
        contractId,
        _function,
        callerId,
        senderId,
        recipientId,
    }: {
        limit?: number,
        orderBy?: 'hash' | 'block_hash' | 'block_height' | 'version' | 'micro_index' | 'micro_time' | 'type' | 'contract_id' | 'function' | 'caller_id' | 'sender_id' | 'recipient_id' | 'created_at',
        orderDirection?: 'ASC' | 'DESC',
        /**
         * Comma-separated list of relations to include. Supports nested relations. Available: keyBlock, keyBlock.txs, keyBlock.txs.keyBlock, keyBlock.microBlocks, keyBlock.microBlocks.keyBlock, keyBlock.microBlocks.txs. Example: "keyBlock"
         */
        includes?: string,
        page?: number,
        /**
         * Filter by type
         */
        type?: string,
        /**
         * Filter by contract_id
         */
        contractId?: string,
        /**
         * Filter by function
         */
        _function?: string,
        /**
         * Filter by caller_id
         */
        callerId?: string,
        /**
         * Filter by sender_id
         */
        senderId?: string,
        /**
         * Filter by recipient_id
         */
        recipientId?: string,
    }): CancelablePromise<Pagination> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v2/mdw/txs',
            query: {
                'limit': limit,
                'order_by': orderBy,
                'order_direction': orderDirection,
                'includes': includes,
                'page': page,
                'type': type,
                'contract_id': contractId,
                'function': _function,
                'caller_id': callerId,
                'sender_id': senderId,
                'recipient_id': recipientId,
            },
        });
    }
    /**
     * Get tx by hash
     * Retrieve a specific tx by its hash
     * @returns Tx tx retrieved successfully
     * @throws ApiError
     */
    public static gettxByHash({
        hash,
        includes,
    }: {
        /**
         * tx hash
         */
        hash: string,
        /**
         * Comma-separated list of relations to include. Supports nested relations. Available: keyBlock, keyBlock.txs, keyBlock.txs.keyBlock, keyBlock.microBlocks, keyBlock.microBlocks.keyBlock, keyBlock.microBlocks.txs. Example: "keyBlock"
         */
        includes?: string,
    }): CancelablePromise<Tx> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v2/mdw/txs/{hash}',
            path: {
                'hash': hash,
            },
            query: {
                'includes': includes,
            },
        });
    }
}
