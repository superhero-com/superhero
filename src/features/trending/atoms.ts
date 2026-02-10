import { atom } from 'jotai';
import { PRICE_MOVEMENT_TIMEFRAME_DEFAULT, PRICE_MOVEMENT_TIMEFRAMES } from '@/utils/constants';

export type PriceMovementTimeframe = (typeof PRICE_MOVEMENT_TIMEFRAMES)[number];

export const performanceChartTimeframeAtom = atom<PriceMovementTimeframe>(PRICE_MOVEMENT_TIMEFRAME_DEFAULT);
