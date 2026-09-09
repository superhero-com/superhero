/**
 * Profile Jotai state — ported from
 * `superhero-app/src/features/chat/domains/profiles/profiles.state.ts`.
 *
 * In-memory reactive mirror of the encrypted profile cache (seeded + cleared by
 * the `ChatProvider`).
 */
import { atom } from 'jotai';
import type { StoredProfiles } from '../../core/types';

/** Cached kind-0 profiles keyed by hex pubkey. */
export const profilesAtom = atom<StoredProfiles>({});

/** Read one cached profile reactively. */
export const getProfileAtom = (pubkey: string) => atom(
  (get) => get(profilesAtom)[pubkey] || null,
);
