/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { KeyBlock } from '../models/KeyBlock';
import type { Pagination } from '../models/Pagination';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class MdwKeyBlocksService {
    /**
     * Get all keyBlocks
     * Retrieve a paginated list of all keyBlocks with optional sorting and filtering
     * @returns any
     * @throws ApiError
     */
    public static listAllkeyBlocks({
        limit,
        orderBy,
        orderDirection,
        includes,
        page,
        hash,
        height,
        prevHash,
        prevKeyHash,
        beneficiary,
        miner,
        version,
    }: {
        limit?: number,
        orderBy?: 'height' | 'hash' | 'prev_hash' | 'prev_key_hash' | 'state_hash' | 'beneficiary' | 'miner' | 'time' | 'transactions_count' | 'micro_blocks_count' | 'beneficiary_reward' | 'nonce' | 'target' | 'version' | 'created_at',
        orderDirection?: 'ASC' | 'DESC',
        /**
         * Comma-separated list of relations to include. Supports nested relations. Available: txs, txs.keyBlock, txs.keyBlock.txs, txs.keyBlock.microBlocks, microBlocks, microBlocks.keyBlock, microBlocks.keyBlock.txs, microBlocks.keyBlock.microBlocks, microBlocks.txs, microBlocks.txs.keyBlock. Example: "txs,txs.keyBlock"
         */
        includes?: string,
        page?: number,
        /**
         * Filter by hash
         */
        hash?: string,
        /**
         * Filter by height
         */
        height?: string,
        /**
         * Filter by prev_hash
         */
        prevHash?: string,
        /**
         * Filter by prev_key_hash
         */
        prevKeyHash?: string,
        /**
         * Filter by beneficiary
         */
        beneficiary?: string,
        /**
         * Filter by miner
         */
        miner?: string,
        /**
         * Filter by version
         */
        version?: string,
    }): CancelablePromise<Pagination> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v2/mdw/key-blocks',
            query: {
                'limit': limit,
                'order_by': orderBy,
                'order_direction': orderDirection,
                'includes': includes,
                'page': page,
                'hash': hash,
                'height': height,
                'prev_hash': prevHash,
                'prev_key_hash': prevKeyHash,
                'beneficiary': beneficiary,
                'miner': miner,
                'version': version,
            },
        });
    }
    /**
     * Get keyBlock by hash
     * Retrieve a specific keyBlock by its hash
     * @returns KeyBlock keyBlock retrieved successfully
     * @throws ApiError
     */
    public static getkeyBlockByHash({
        hash,
        includes,
    }: {
        /**
         * keyBlock hash
         */
        hash: string,
        /**
         * Comma-separated list of relations to include. Supports nested relations. Available: txs, txs.keyBlock, txs.keyBlock.txs, txs.keyBlock.microBlocks, microBlocks, microBlocks.keyBlock, microBlocks.keyBlock.txs, microBlocks.keyBlock.microBlocks, microBlocks.txs, microBlocks.txs.keyBlock. Example: "txs,txs.keyBlock"
         */
        includes?: string,
    }): CancelablePromise<KeyBlock> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v2/mdw/key-blocks/{hash}',
            path: {
                'hash': hash,
            },
            query: {
                'includes': includes,
            },
        });
    }
}
