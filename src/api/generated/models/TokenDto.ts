/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PriceDto } from './PriceDto';
export type TokenDto = {
    id: number;
    network_id: string;
    factory_address: string;
    sale_address: string;
    creator_address: string;
    owner_address: string;
    beneficiary_address: string;
    bonding_curve_address: string;
    collection: string;
    metaInfo: Record<string, any>;
    address: string;
    name: string;
    symbol: string;
    decimals: string;
    rank: number;
    holders_count: number;
    price: string;
    price_data: PriceDto;
    sell_price: string;
    sell_price_data: PriceDto;
    market_cap: string;
    market_cap_data: PriceDto;
    total_supply: string;
    dao_balance: string;
    created_at: string;
};

