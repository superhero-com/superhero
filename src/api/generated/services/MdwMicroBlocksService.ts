/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MicroBlock } from '../models/MicroBlock';
import type { Pagination } from '../models/Pagination';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class MdwMicroBlocksService {
    /**
     * Get all microBlocks
     * Retrieve a paginated list of all microBlocks with optional sorting and filtering
     * @returns any
     * @throws ApiError
     */
    public static listAllmicroBlocks({
        limit,
        orderBy,
        orderDirection,
        includes,
        page,
        hash,
        height,
        prevHash,
        prevKeyHash,
        version,
        gas,
        microBlockIndex,
    }: {
        limit?: number,
        orderBy?: 'height' | 'hash' | 'prev_hash' | 'prev_key_hash' | 'state_hash' | 'time' | 'transactions_count' | 'version' | 'gas' | 'micro_block_index' | 'created_at',
        orderDirection?: 'ASC' | 'DESC',
        /**
         * Comma-separated list of relations to include. Supports nested relations. Available: keyBlock, keyBlock.txs, keyBlock.txs.keyBlock, keyBlock.microBlocks, keyBlock.microBlocks.keyBlock, keyBlock.microBlocks.txs, txs, txs.keyBlock, txs.keyBlock.txs, txs.keyBlock.microBlocks. Example: "keyBlock"
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
         * Filter by version
         */
        version?: string,
        /**
         * Filter by gas
         */
        gas?: string,
        /**
         * Filter by micro_block_index
         */
        microBlockIndex?: string,
    }): CancelablePromise<Pagination> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v2/mdw/micro-blocks',
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
                'version': version,
                'gas': gas,
                'micro_block_index': microBlockIndex,
            },
        });
    }
    /**
     * Get microBlock by hash
     * Retrieve a specific microBlock by its hash
     * @returns MicroBlock microBlock retrieved successfully
     * @throws ApiError
     */
    public static getmicroBlockByHash({
        hash,
        includes,
    }: {
        /**
         * microBlock hash
         */
        hash: string,
        /**
         * Comma-separated list of relations to include. Supports nested relations. Available: keyBlock, keyBlock.txs, keyBlock.txs.keyBlock, keyBlock.microBlocks, keyBlock.microBlocks.keyBlock, keyBlock.microBlocks.txs, txs, txs.keyBlock, txs.keyBlock.txs, txs.keyBlock.microBlocks. Example: "keyBlock"
         */
        includes?: string,
    }): CancelablePromise<MicroBlock> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v2/mdw/micro-blocks/{hash}',
            path: {
                'hash': hash,
            },
            query: {
                'includes': includes,
            },
        });
    }
}
