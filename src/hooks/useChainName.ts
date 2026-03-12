import { useAtom } from 'jotai';
import { useEffect, useMemo } from 'react';
import { chainNamesAtom } from '../atoms/walletAtoms';
import configs from '../configs';

const CHAIN_NAMES_REFRESH_INTERVAL = 1000 * 60 * 5; // 5 minutes

export function useChainName(accountAddress: string) {
  const [chainNames] = useAtom(chainNamesAtom);
  const chainName = useMemo(() => chainNames[accountAddress], [chainNames, accountAddress]);
  return { chainName };
}

export function useSuperheroChainNames() {
  const [chainNames, setChainNames] = useAtom(chainNamesAtom);

  useEffect(() => {
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
    const interval = setInterval(fetchAll, CHAIN_NAMES_REFRESH_INTERVAL);
    return () => clearInterval(interval);
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
      ([, name]) => (name || '').toLowerCase() === target,
    );
    return match ? match[0] : null;
  }, [chainNames, chainNameInput]);
  return { address };
}
