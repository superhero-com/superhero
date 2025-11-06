/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PriceDto } from './PriceDto';
import type { TokenPerformanceDto } from './TokenPerformanceDto';
export type TokenDto = {
    id: number;
    network_id: string;
    factory_address: string;
    sale_address: string;
    create_tx_hash: string;
    creator_address: string;
    dao_address: string;
    owner_address: string;
    beneficiary_address: string;
    bonding_curve_address: string;
    collection: string;
    metaInfo: Record<string, any>;
    unlisted: boolean;
    last_sync_tx_count: number;
    tx_count: number;
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
    trending_score: number;
    trending_score_update_at: string;
    performance: TokenPerformanceDto | null;
    created_at: string;
    tx_type: string;
    volume: string;
    amount: PriceDto;
    unit_price: PriceDto;
};

