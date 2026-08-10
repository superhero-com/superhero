/**
 * Profile storage — ported from
 * `superhero-app/src/features/chat/domains/profiles/profiles.storage.ts`.
 *
 * Over the session's encrypted KV store. Cached kind-0 profiles carry names /
 * `ae_address` / bio, so they are sealed at rest with the rest of the chat data.
 */
import type { Profile, StoredProfiles } from '../../core/types';
import { StorageKeys } from '../../core/constants';
import { getChatStore } from '../../storage/chat-store';

/** Persist the full profile cache. */
export async function saveProfiles(profiles: StoredProfiles): Promise<void> {
  await getChatStore().setItem(StorageKeys.PROFILES, JSON.stringify(profiles));
}

/** Load the profile cache. */
export async function loadProfiles(): Promise<StoredProfiles> {
  try {
    const data = await getChatStore().getItem(StorageKeys.PROFILES);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

/** Upsert one profile. */
export async function saveProfile(pubkey: string, profile: Profile): Promise<void> {
  const profiles = await loadProfiles();
  profiles[pubkey] = profile;
  await saveProfiles(profiles);
}

/** Read one cached profile, or null. */
export async function getProfile(pubkey: string): Promise<Profile | null> {
  const profiles = await loadProfiles();
  return profiles[pubkey] || null;
}
