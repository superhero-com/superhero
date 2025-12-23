import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

import type { CurrencyRates } from '../utils/types';

// Persisted currency state shared across the app.
export const currencyRatesAtom = atomWithStorage<CurrencyRates>(
  'currency:rates',
  {},
);

// Updated whenever currencyRatesAtom is refreshed by the global poller.
export const currencyRatesUpdatedAtAtom = atom<number>(0);

// Updated whenever the global poller fails to fetch rates.
// Used by UI to distinguish "loading/checking" from "offline".
export const currencyRatesLastErrorAtAtom = atom<number>(0);


