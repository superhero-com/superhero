import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useMemo } from 'react';
import { chainNamesAtom } from '../atoms/walletAtoms';
import configs from '../configs';

const CHAIN_NAMES_REFRESH_INTERVAL = 1000 * 60 * 5; // 5 minutes

// Module-level singleton — survives StrictMode remounts
let intervalId: ReturnType<typeof setInterval> | null = null;

export function useChainName(accountAddress: string) {
  const chainNames = useAtomValue(chainNamesAtom);
  const chainName = useMemo(() => chainNames[accountAddress], [chainNames, accountAddress]);
  return { chainName };
}

export function useSuperheroChainNames() {
  const chainNames = useAtomValue(chainNamesAtom);
  const setChainNames = useSetAtom(chainNamesAtom);

  useEffect(() => {
    if (intervalId !== null) return;

    const backendUrl = configs.networks.ae_mainnet.superheroBackendUrl.replace(/\/$/, '');

    const fetchAll = async () => {
      try {
        const res = await fetch(`${backendUrl}/cache/chainNames`);
        const names = await res.json();
        if (names && typeof names === 'object') {
          setChainNames((prev) => ({ ...prev, ...names }));
        }
      } catch (e) {
        console.warn('Failed to load chain names', e);
      }
    };

    fetchAll();
    intervalId = setInterval(fetchAll, CHAIN_NAMES_REFRESH_INTERVAL);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { chainNames };
}

export function useAddressByChainName(chainNameInput?: string) {
  const [chainNames] = useAtom(chainNamesAtom);
  const address = useMemo(() => {
    if (!chainNameInput) return null;
    const target = chainNameInput.toLowerCase();
    const match = Object.entries(chainNames).find(
      ([, name]) => ((name as string) || '').toLowerCase() === target,
    );
    return match ? match[0] : null;
  }, [chainNames, chainNameInput]);
  return { address };
}
