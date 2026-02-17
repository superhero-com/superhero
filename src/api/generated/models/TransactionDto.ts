/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PriceDto } from './PriceDto';
export type TransactionDto = {
    id: number;
    address: string;
    tx_hash: string;
    tx_type: string;
    spent_amount: string;
    spent_amount_data: PriceDto;
    volume: string;
    price: string;
    price_data: PriceDto;
    sell_price: string;
    sell_price_data: PriceDto;
    created_at: string;
};

