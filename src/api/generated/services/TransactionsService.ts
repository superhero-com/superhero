/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Pagination } from '../models/Pagination';
import type { TransactionDto } from '../models/TransactionDto';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class TransactionsService {
    /**
     * @returns any
     * @throws ApiError
     */
    public static listTransactions({
        tokenAddress,
        accountAddress,
        includes,
        limit,
        page,
    }: {
        /**
         * Token address sale address
         */
        tokenAddress?: string,
        /**
         * Filter Transaction Made by this account address
         */
        accountAddress?: string,
        includes?: 'token',
        limit?: number,
        page?: number,
    }): CancelablePromise<Pagination> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/transactions',
            query: {
                'token_address': tokenAddress,
                'account_address': accountAddress,
                'includes': includes,
                'limit': limit,
                'page': page,
            },
        });
    }
    /**
     * @returns TransactionDto
     * @throws ApiError
     */
    public static getTransactionByHash({
        txHash,
    }: {
        /**
         * Transaction hash to fetch the transaction details
         */
        txHash: string,
    }): CancelablePromise<TransactionDto> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/transactions/by-hash',
            query: {
                'tx_hash': txHash,
            },
        });
    }
}
