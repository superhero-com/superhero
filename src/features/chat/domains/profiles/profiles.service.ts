/**
 * Profile service — ported from
 * `superhero-app/src/features/chat/domains/profiles/profiles.service.ts`.
 *
 * Reads (fetch / bulk-fetch) are public and need no key. Writes
 * (`updateMyProfile`) publish a kind-0 event and read the caller's own pubkey via
 * the revocable {@link NostrIdentityProvider} (`getPublicKey`), so after lock the
 * publish path rejects rather than signing with a stale key. The camelCase
 * `aeAddress` is serialised to the snake_case `ae_address` wire field; all decode
 * routes through the shared `eventToProfile()`.
 */
import type { Profile } from '../../core/types';
import type { NostrClient } from '../../nostr/nostr-client';
import type { NostrIdentityProvider } from '../../identity/nostr-identity';
import { eventToProfile } from '../../utils/converters';
import { sanitizeProfileField, isValidProfileName, isValidUrl } from '../../utils/validators';
import { saveProfile, getProfile } from './profiles.storage';

export class ProfileService {
  private client: NostrClient;

  private identity: NostrIdentityProvider;

  private pendingFetches: Map<string, Promise<Profile | null>>;

  constructor(client: NostrClient, identity: NostrIdentityProvider) {
    this.client = client;
    this.identity = identity;
    this.pendingFetches = new Map();
  }

  /** Fetch one profile from relays, de-duplicating concurrent fetches. */
  async fetchProfile(pubkey: string): Promise<Profile | null> {
    const pending = this.pendingFetches.get(pubkey);
    if (pending) return pending;

    const fetchPromise = this.doFetchProfile(pubkey);
    this.pendingFetches.set(pubkey, fetchPromise);
    try {
      return await fetchPromise;
    } finally {
      this.pendingFetches.delete(pubkey);
    }
  }

  private async doFetchProfile(pubkey: string): Promise<Profile | null> {
    const events = await this.client.fetchEvents([{ authors: [pubkey], kinds: [0], limit: 1 }]);
    if (events.length > 0) {
      const profile = eventToProfile(events[0]);
      await saveProfile(pubkey, profile);
      return profile;
    }
    return null;
  }

  /** Cache-first read, fetching from relays on a miss. */
  async getProfile(pubkey: string, skipCache = false): Promise<Profile | null> {
    if (!skipCache) {
      const cached = await getProfile(pubkey);
      if (cached) return cached;
    }
    return this.fetchProfile(pubkey);
  }

  /** Merge, validate, publish, and cache the current user's kind-0 profile. */
  async updateMyProfile(updates: Partial<Profile>): Promise<void> {
    const myPubkey = await this.identity.getPublicKey();
    const current = (await getProfile(myPubkey)) || {};
    const next: Profile = { ...current, ...updates };

    if (next.name && !isValidProfileName(next.name)) {
      throw new Error('Invalid profile name');
    }
    if (next.website && !isValidUrl(next.website)) {
      throw new Error('Invalid website URL');
    }
    if (next.name) next.name = sanitizeProfileField(next.name, 50);
    if (next.about) next.about = sanitizeProfileField(next.about, 500);

    // Domain `aeAddress` (camelCase) → wire `ae_address` (snake_case). All other
    // fields keep their names; the cached domain profile keeps `aeAddress`.
    const { aeAddress, ...rest } = next;
    const content = { ...rest, ...(aeAddress ? { ae_address: aeAddress } : {}) };

    await this.client.publishEvent({
      kind: 0,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: JSON.stringify(content),
    });

    await saveProfile(myPubkey, next);
  }

  /** Bulk-fetch profiles for a set of pubkeys, caching each. */
  async fetchProfiles(pubkeys: string[]): Promise<Map<string, Profile>> {
    const results = new Map<string, Profile>();
    if (pubkeys.length === 0) return results;
    const events = await this.client.fetchEvents([
      { authors: pubkeys, kinds: [0], limit: pubkeys.length },
    ]);
    await Promise.all(events.map(async (event) => {
      const profile = eventToProfile(event);
      results.set(event.pubkey, profile);
      await saveProfile(event.pubkey, profile);
    }));
    return results;
  }
}
