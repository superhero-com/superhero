/**
 * useGatedRoom — token-gated NIP-29 group chat for a single room, keyed by its
 * **sale address** (`ct_…`) which is the NIP-29 group id verbatim. Reads kind
 * 9/11 from the relay (`#h` = saleAddress) over a dedicated {@link GatedRoomClient};
 * the relay URL comes from the API config (`useRoomsConfig`), never a hard-coded
 * host. Posts optimistically, signed through the revocable room-session identity.
 *
 * The general SimplePool (DMs / public channels) is untouched. A public room is
 * readable without an unlocked identity; posting and private-room reads need one.
 */
import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';

import {
  GatedRoomClient,
  GatedRoomPublishError,
  type GroupMetadata,
} from '../nostr/gated-room';
import { NostrKind } from '../core/constants';
import type { NostrEvent } from '../core/types';
import { useRoomsConfig } from './useRoomsConfig';
import { useRoomSession } from './useRoomSession';

export type GatedMessageStatus = 'sending' | 'sent' | 'failed';

export type GatedSystemAction = 'add' | 'remove' | 'leave';

export interface GatedSystemMeta {
  action: GatedSystemAction;
  actorPubkey: string;
  targetPubkeys: string[];
  actorIsSystem: boolean;
}

export interface GatedMessage {
  id: string;
  eventId?: string;
  content: string;
  authorPubkey: string;
  isFromMe: boolean;
  timestamp: number; // ms
  status: GatedMessageStatus;
  /** Present iff this is a membership system line (rendered centered, no bubble). */
  system?: GatedSystemMeta;
}

const SYSTEM_KINDS: ReadonlySet<number> = new Set([
  NostrKind.GroupAddUser,
  NostrKind.GroupRemoveUser,
  NostrKind.GroupLeaveRequest,
]);

function buildChatMessage(event: NostrEvent, myPubkey?: string | null): GatedMessage {
  return {
    id: `msg_${event.id}`,
    eventId: event.id,
    content: event.content,
    authorPubkey: event.pubkey,
    isFromMe: !!myPubkey && event.pubkey === myPubkey,
    timestamp: event.created_at * 1000,
    status: 'sent',
  };
}

function buildSystemMessage(
  event: NostrEvent,
  relayPubkey: string | null,
  myPubkey?: string | null,
): GatedMessage | null {
  const targets = event.tags
    .filter((t) => t[0] === 'p' && !!t[1])
    .map((t) => t[1]);
  let action: GatedSystemAction;
  if (event.kind === NostrKind.GroupAddUser) action = 'add';
  else if (event.kind === NostrKind.GroupRemoveUser) action = 'remove';
  else if (event.kind === NostrKind.GroupLeaveRequest) action = 'leave';
  else return null;
  if (action !== 'leave' && targets.length === 0) return null;
  return {
    id: `sys_${event.id}`,
    eventId: event.id,
    content: '',
    authorPubkey: event.pubkey,
    isFromMe: !!myPubkey && event.pubkey === myPubkey,
    timestamp: event.created_at * 1000,
    status: 'sent',
    system: {
      action,
      actorPubkey: event.pubkey,
      targetPubkeys: targets,
      actorIsSystem: !!relayPubkey && event.pubkey === relayPubkey,
    },
  };
}

/**
 * Posting / read access for the room:
 *   - `loading`       — relay/config not ready yet
 *   - `ok`            — can post (caller is a `readable` member)
 *   - `not-member`    — a post was rejected (must hold the token + link nostr)
 *   - `auth-required` — relay demanded NIP-42 AUTH (private room, not authed)
 */
export type GatedRoomAccess = 'loading' | 'ok' | 'not-member' | 'auth-required';

export interface UseGatedRoomOptions {
  /** Private rooms need NIP-42 AUTH before subscribing. */
  isPrivate?: boolean;
  /** Whether the user may post — `RoomView.readable`. Default-DENY at the caller. */
  readable?: boolean;
  /** Also surface NIP-29 membership events as in-thread system lines. */
  includeSystem?: boolean;
}

const HISTORY_PAGE_SIZE = 50;

export function useGatedRoom(
  saleAddress: string,
  options: UseGatedRoomOptions = {},
) {
  const { isPrivate = false, readable = false, includeSystem = false } = options;
  const { identity, pubkey, isUnlocked } = useRoomSession();
  const { relayUrl } = useRoomsConfig();
  const [messages, setMessages] = useState<GatedMessage[]>([]);
  const [metadata, setMetadata] = useState<GroupMetadata | null>(null);
  const [access, setAccess] = useState<GatedRoomAccess>('loading');
  const [isLoadingEarlier, setIsLoadingEarlier] = useState(false);
  const [hasEarlier, setHasEarlier] = useState(true);
  const clientRef = useRef<GatedRoomClient | null>(null);
  const relayPubkeyRef = useRef<string | null>(null);

  const canPost = readable;

  const upsertEvent = useCallback(
    (event: NostrEvent) => {
      setMessages((prev) => {
        if (prev.some((m) => m.eventId === event.id)) return prev;
        const msg = SYSTEM_KINDS.has(event.kind)
          ? buildSystemMessage(event, relayPubkeyRef.current, pubkey)
          : buildChatMessage(event, pubkey);
        if (!msg) return prev;
        return [...prev, msg].sort((a, b) => a.timestamp - b.timestamp);
      });
    },
    [pubkey],
  );

  useEffect(() => {
    if (!saleAddress || !relayUrl) {
      setAccess('loading');
      return undefined;
    }
    let cancelled = false;
    let closer: { close: () => void } | null = null;
    setMessages([]);
    setMetadata(null);
    setAccess(readable ? 'ok' : 'not-member');
    setIsLoadingEarlier(false);
    setHasEarlier(true);
    relayPubkeyRef.current = null;

    let client: GatedRoomClient;
    try {
      client = new GatedRoomClient(identity, relayUrl);
    } catch {
      // Insecure/invalid relay URL — surface as not-ready rather than crashing.
      setAccess('loading');
      return undefined;
    }
    clientRef.current = client;

    (async () => {
      const meta = await client.getGroupMetadata(saleAddress).catch(() => null);
      relayPubkeyRef.current = client.relayPubkey;
      if (!cancelled && meta) setMetadata(meta);
      const history = await client
        .fetchRoomHistory(saleAddress, {
          limit: HISTORY_PAGE_SIZE,
          isPrivate,
          includeSystem,
        })
        .catch(() => [] as NostrEvent[]);
      if (!cancelled) {
        history.forEach(upsertEvent);
        if (history.length < HISTORY_PAGE_SIZE) setHasEarlier(false);
      }
      const sub = await client.subscribeRoom(
        saleAddress,
        (event) => {
          if (!cancelled) upsertEvent(event);
        },
        { isPrivate, includeSystem },
      );
      if (cancelled) {
        sub.close();
        return;
      }
      closer = sub;
    })().catch(() => {
      if (cancelled) return;
      // A read rejection on a private room means we couldn't AUTH in.
      if (isPrivate) setAccess('auth-required');
    });

    return () => {
      cancelled = true;
      closer?.close();
      client.close();
      clientRef.current = null;
    };
  }, [saleAddress, identity, relayUrl, isPrivate, readable, includeSystem, upsertEvent]);

  const loadEarlier = useCallback(async () => {
    const client = clientRef.current;
    if (!client || !saleAddress) return;
    if (isLoadingEarlier || !hasEarlier) return;
    const oldestMs = messages.reduce(
      (min, m) => (m.timestamp < min ? m.timestamp : min),
      Number.POSITIVE_INFINITY,
    );
    const until = Number.isFinite(oldestMs)
      ? Math.floor(oldestMs / 1000) - 1
      : undefined;
    setIsLoadingEarlier(true);
    try {
      const older = await client.fetchRoomHistory(saleAddress, {
        until,
        limit: HISTORY_PAGE_SIZE,
        isPrivate,
        includeSystem,
      });
      const fresh = older.filter(
        (e) => !messages.some((m) => m.eventId === e.id),
      );
      fresh.forEach(upsertEvent);
      if (older.length < HISTORY_PAGE_SIZE || fresh.length === 0) {
        setHasEarlier(false);
      }
    } catch {
      // Best-effort paging — leave hasEarlier set so the user can retry.
    } finally {
      setIsLoadingEarlier(false);
    }
  }, [
    saleAddress,
    isPrivate,
    includeSystem,
    isLoadingEarlier,
    hasEarlier,
    messages,
    upsertEvent,
  ]);

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      const client = clientRef.current;
      if (!saleAddress || !client || !trimmed) return;
      if (!canPost) {
        setAccess('not-member');
        return;
      }

      const optimisticId = `opt_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2)}`;
      const optimistic: GatedMessage = {
        id: optimisticId,
        content: trimmed,
        authorPubkey: pubkey ?? '',
        isFromMe: true,
        timestamp: Date.now(),
        status: 'sending',
      };
      setMessages((prev) => [...prev, optimistic]);

      try {
        const eventId = await client.sendRoomMessage(saleAddress, trimmed);
        setMessages((prev) => prev.map((m) => (m.id === optimisticId ? { ...m, eventId, status: 'sent' } : m)));
        setAccess('ok');
      } catch (error) {
        if (error instanceof GatedRoomPublishError) {
          if (error.isAuthRequired) setAccess('auth-required');
          else if (error.isNotMember) setAccess('not-member');
        }
        setMessages((prev) => prev.map((m) => (m.id === optimisticId ? { ...m, status: 'failed' } : m)));
        throw error;
      }
    },
    [saleAddress, canPost, pubkey],
  );

  const isReady = useMemo(() => !!relayUrl, [relayUrl]);

  return {
    name: metadata?.name,
    about: metadata?.about,
    isPrivate: metadata?.isPrivate ?? isPrivate,
    messages,
    sendMessage,
    isReady,
    access,
    canPost,
    /** True when the user may post but the room session is locked (must unlock). */
    needsUnlock: canPost && !isUnlocked,
    loadEarlier,
    isLoadingEarlier,
    hasEarlier,
  };
}
