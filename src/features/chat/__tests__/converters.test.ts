// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  npubToHex, hexToNpub, normalizeNostrId, eventToDirectMessage, eventToProfile,
  getDMConversationId, parseConversationId,
} from '../utils/converters';
import type { NostrEvent } from '../core/types';

const PUB = 'e8bcf3823669444d0b49ad45d65088635d9fd8500a75b5f20b59abefa56a144f';
const NPUB = 'npub1az708q3kd9zy6z6f44zav5ygvdwelkzspf6mtusttx47lft2z38sghk0w7';

describe('converters', () => {
  it('round-trips npub <-> hex', () => {
    expect(hexToNpub(PUB)).toBe(NPUB);
    expect(npubToHex(NPUB)).toBe(PUB);
  });

  it('normalizeNostrId accepts both hex and npub', () => {
    expect(normalizeNostrId(PUB)).toEqual({ pubkey: PUB, npub: NPUB });
    expect(normalizeNostrId(NPUB)).toEqual({ pubkey: PUB, npub: NPUB });
    expect(() => normalizeNostrId('not-an-id')).toThrow();
  });

  it('eventToProfile maps ae_address (snake_case) to aeAddress', () => {
    const event = { content: JSON.stringify({ name: 'Ann', ae_address: 'ak_123' }) } as NostrEvent;
    const profile = eventToProfile(event);
    expect(profile.name).toBe('Ann');
    expect(profile.aeAddress).toBe('ak_123');
  });

  it('eventToProfile returns {} on malformed JSON', () => {
    expect(eventToProfile({ content: 'not json' } as NostrEvent)).toEqual({});
  });

  it('eventToDirectMessage marks own vs incoming correctly', () => {
    const incoming = {
      id: 'e1', pubkey: 'sender', created_at: 100, kind: 4, tags: [['p', 'me']], content: '', sig: '',
    } as NostrEvent;
    const dm = eventToDirectMessage(incoming, 'hi', 'me');
    expect(dm.isFromMe).toBe(false);
    expect(dm.fromPubkey).toBe('sender');
    expect(dm.status).toEqual({ type: 'delivered', at: 100000 });

    const outgoing = { ...incoming, pubkey: 'me' } as NostrEvent;
    const sent = eventToDirectMessage(outgoing, 'hi', 'me');
    expect(sent.isFromMe).toBe(true);
    expect(sent.toPubkey).toBe('me');
    expect(sent.status).toEqual({ type: 'sent', eventId: 'e1' });
  });

  it('DM conversation id round-trips', () => {
    expect(getDMConversationId('abc')).toBe('dm_abc');
    expect(parseConversationId('dm_abc')).toEqual({ type: 'dm', id: 'abc' });
    expect(() => parseConversationId('channel_x')).toThrow();
  });
});
