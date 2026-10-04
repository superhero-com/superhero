import { useEffect } from 'react';
import { atom, useAtom } from 'jotai';
import { CONFIG } from '@/config';
import { SHORTS_API } from './api';

export type CreatorLogin = { address: string; token: string; expiresAt: number };
export type CreatorSession = CreatorLogin & { api: string; network: string; contract: string };
const storageKey = 'shorts:creator-session';
const readSession = (): CreatorSession | undefined => {
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    if (value && typeof value.address === 'string' && typeof value.token === 'string'
      && typeof value.contract === 'string' && value.api === SHORTS_API
      && value.network === CONFIG.NETWORK && Number.isFinite(value.expiresAt)
      && value.expiresAt > Date.now()) return value;
  } catch { /* Storage may be unavailable; the in-memory session still works. */ }
  return undefined;
};
const currentSessionAtom = atom<CreatorSession | undefined>(readSession());
// Shared with the app wallet lifecycle, so leaving Shorts does not sign out.
// Tab storage preserves an unexpired session on reload; no localStorage credential is used.
export const creatorSessionAtom = atom(
  (get) => get(currentSessionAtom),
  (get, set, update: CreatorSession | undefined | ((current: CreatorSession | undefined) => CreatorSession | undefined)) => {
    const next = typeof update === 'function' ? update(get(currentSessionAtom)) : update;
    set(currentSessionAtom, next);
    try {
      if (next) sessionStorage.setItem(storageKey, JSON.stringify(next));
      else sessionStorage.removeItem(storageKey);
    } catch { /* An unavailable tab store must not break wallet actions. */ }
  },
);

// Runs in App, including while the user is outside Shorts. Disconnecting or
// changing the main account invalidates creator access immediately.
export const useSyncShortsWalletSession = (address?: string) => {
  const [session, setSession] = useAtom(creatorSessionAtom);
  useEffect(() => {
    if (!session) return undefined;
    const clear = () => setSession((current) => (current === session ? undefined : current));
    if (session.address !== address || session.api !== SHORTS_API
      || session.network !== CONFIG.NETWORK || session.expiresAt <= Date.now()) {
      clear();
      return undefined;
    }
    const timer = setTimeout(clear, session.expiresAt - Date.now());
    return () => clearTimeout(timer);
  }, [address, session, setSession]);
};
