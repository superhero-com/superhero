import { useQuery } from '@tanstack/react-query';
import { useSetAtom } from 'jotai';
import { PropsWithChildren } from 'react';

import { SuperheroApi } from '@/api/backend';
import { currencyRatesAtom, currencyRatesLastErrorAtAtom, currencyRatesUpdatedAtAtom } from '@/atoms/currencyAtoms';
import type { CurrencyRates } from '@/utils/types';

/**
 * Polls AE->fiat conversion rates globally (once) and stores them in Jotai.
 * This prevents multiple components from each starting their own polling loop.
 */
export function AePricePollingProvider({ children }: PropsWithChildren) {
  const setCurrencyRates = useSetAtom(currencyRatesAtom);
  const setUpdatedAt = useSetAtom(currencyRatesUpdatedAtAtom);
  const setLastErrorAt = useSetAtom(currencyRatesLastErrorAtAtom);

  const normalizeRates = (raw: any): CurrencyRates | null => {
    if (!raw || typeof raw !== 'object') return null;
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw)) {
      const key = String(k).toLowerCase();
      const num = typeof v === 'number' ? v : v == null ? NaN : Number(v);
      if (Number.isFinite(num)) out[key] = num;
    }
    return Object.keys(out).length ? (out as CurrencyRates) : null;
  };

  useQuery({
    queryKey: ['currency-rates'],
    queryFn: async () => {
      try {
        const raw = await SuperheroApi.getCurrencyRates();
        const rates = normalizeRates(raw);
        if (!rates) throw new Error('Invalid currency rates response');

        setCurrencyRates(rates);
        setUpdatedAt(Date.now());
        // Clear error marker on success
        setLastErrorAt(0);
        return rates;
      } catch (e) {
        setLastErrorAt(Date.now());
        throw e;
      }
    },
    staleTime: 20_000,
    refetchInterval: 20_000,
    // Prevent extra refetches during route changes / tab focus.
    // We want a single global poller on a fixed interval.
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchIntervalInBackground: true,
    retry: 1,
  });

  return children as any;
}


