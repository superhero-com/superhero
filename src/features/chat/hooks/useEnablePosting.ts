/**
 * useEnablePosting — drives the room "enable posting" flow on top of the rooms
 * API access model (`GET /api/rooms?address` only returns rooms the caller is
 * *eligible* for):
 *
 *   - `member_pubkey === null`        ⇒ eligible but **not linked** — link a key.
 *   - `relay_state === 'pending_add'` ⇒ access is being provisioned.
 *   - `readable` (added + pubkey set)  ⇒ can post.
 *   - room not in the list            ⇒ not eligible (must hold the token).
 *
 * It does not reinvent linking: it flips the shared `nostrLinkStatusAtom` to
 * `'prompt'` to open the canonical AE↔Nostr link dialog (stage 2). On a link it
 * refetches the rooms query so `relay_state` can advance; while `pending_add` it
 * polls (fast for a minute, then backing off up to ~10 min) and fires one active
 * `recheckRoomAccess` so a "DB behind the relay" desync heals on its own.
 *
 * The banner derivation lives HERE (not in the screen): it returns a
 * {@link PostingBanner} descriptor the view renders verbatim.
 */
import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { useAtom } from 'jotai';
import { useQueryClient } from '@tanstack/react-query';
import {
  Hash, KeyRound, Lock, type LucideIcon,
} from 'lucide-react';

import { RoomsService } from '@/api/generated';
import { useAccount } from '@/hooks';
import { nostrLinkStatusAtom } from '@/features/nostr-link';
import { roomsQueryKeys } from '../api/rooms-query-keys';
import { formatThresholdDigits } from '../utils/formatters';
import type { GatedRoomSummary } from './useGatedRooms';

/** The reason the composer is gated — picks the banner copy + CTA. */
export type PostingGate =
  | 'link-required'
  | 'provisioning'
  | 'holder-required'
  | 'not-eligible';

/** The CTA a banner offers, matched to the gate cause. */
export type PostingBannerAction = 'link' | 'token' | 'buy' | 'none';

/** A ready-to-render descriptor for the inline access banner. */
export interface PostingBanner {
  gate: PostingGate;
  icon: LucideIcon;
  /** `info` shows a spinner, `lock` dims the icon, `gate` uses the primary accent. */
  tone: 'gate' | 'lock' | 'info';
  text: string;
  action: PostingBannerAction;
  tokenAddress?: string;
}

// Polling cadence while the room is `pending_add`.
const PENDING_POLL_FAST_INTERVAL_MS = 5_000;
const PENDING_POLL_SLOW_INTERVAL_MS = 15_000;
const PENDING_POLL_FAST_WINDOW_MS = 60_000;
const PENDING_POLL_MAX_MS = 10 * 60_000;

// Poll the rooms list after a token buy until the membership row appears.
const ACQUIRE_POLL_INTERVAL_MS = 5_000;
const ACQUIRE_POLL_MAX_TRIES = 24; // ~2 min

interface UseEnablePostingArgs {
  room: GatedRoomSummary | undefined;
  access: 'loading' | 'ok' | 'not-member' | 'auth-required';
  canPost: boolean;
  symbolLabel?: string;
  roomsLoading?: boolean;
}

export interface UseEnablePostingResult {
  gate: PostingGate | null;
  banner: PostingBanner | null;
  requestLink: () => void;
  isLinking: boolean;
  notifyTokenAcquired: () => void;
  refresh: () => void;
}

export function useEnablePosting({
  room,
  access,
  canPost,
  symbolLabel = 'Community',
  roomsLoading = false,
}: UseEnablePostingArgs): UseEnablePostingResult {
  const { activeAccount } = useAccount();
  const queryClient = useQueryClient();
  const address = activeAccount;
  const saleAddress = room?.sale_address;

  const [linkStatus, setLinkStatus] = useAtom(nostrLinkStatusAtom);
  const requestedRef = useRef(false);

  const refetchRooms = useCallback(() => {
    if (!address) return;
    queryClient.invalidateQueries({ queryKey: roomsQueryKeys.list(address) });
  }, [queryClient, address]);

  // ACTIVE recheck (vs the passive `GET /rooms` read): asks the backend to
  // recompute eligibility and heal/provision this caller's membership.
  // Best-effort: a failure is swallowed; on completion we invalidate the rooms
  // query so a healed `relay_state` is picked up.
  const refresh = useCallback(() => {
    if (!address || !saleAddress) {
      refetchRooms();
      return;
    }
    RoomsService.recheckRoomAccess({
      saleAddress,
      requestBody: { address },
    })
      .catch(() => undefined)
      .finally(() => refetchRooms());
  }, [address, saleAddress, refetchRooms]);

  // After a link succeeds, pull the rooms list so `relay_state` can advance.
  useEffect(() => {
    if (!requestedRef.current) return;
    if (linkStatus === 'done' || linkStatus === 'linked') {
      requestedRef.current = false;
      refetchRooms();
    }
  }, [linkStatus, refetchRooms]);

  // On ENTERING the provisioning state, fire one active recheck (once per room).
  const recheckedRef = useRef<string | null>(null);
  useEffect(() => {
    if (room?.relay_state !== 'pending_add' || !saleAddress) return;
    if (recheckedRef.current === saleAddress) return;
    recheckedRef.current = saleAddress;
    refresh();
  }, [room?.relay_state, saleAddress, refresh]);

  // While provisioning (`pending_add`), poll the rooms list so the composer
  // unlocks on its own once the member flips to `added`. Fast for a minute, then
  // backs off, over a ~10 min window. Self-terminates on `added`.
  useEffect(() => {
    if (room?.relay_state !== 'pending_add' || !address) return undefined;
    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const elapsed = Date.now() - startedAt;
      if (elapsed >= PENDING_POLL_MAX_MS) return;
      const interval = elapsed < PENDING_POLL_FAST_WINDOW_MS
        ? PENDING_POLL_FAST_INTERVAL_MS
        : PENDING_POLL_SLOW_INTERVAL_MS;
      timer = setTimeout(() => {
        refetchRooms();
        schedule();
      }, interval);
    };
    schedule();
    return () => clearTimeout(timer);
  }, [room?.relay_state, address, refetchRooms]);

  // After a token buy, poll until the membership row appears (indexer lag).
  const [pollForAccess, setPollForAccess] = useState(false);
  const notifyTokenAcquired = useCallback(() => setPollForAccess(true), []);
  useEffect(() => {
    if (!pollForAccess || !address) return undefined;
    if (room || canPost) {
      setPollForAccess(false);
      return undefined;
    }
    let tries = 0;
    const id = setInterval(() => {
      tries += 1;
      refetchRooms();
      if (tries >= ACQUIRE_POLL_MAX_TRIES) {
        clearInterval(id);
        setPollForAccess(false);
      }
    }, ACQUIRE_POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [pollForAccess, room, canPost, address, refetchRooms]);

  const requestLink = useCallback(() => {
    if (linkStatus === 'linking') return;
    requestedRef.current = true;
    setLinkStatus('prompt');
  }, [linkStatus, setLinkStatus]);

  const gate = useMemo((): PostingGate | null => {
    if (canPost) return null;
    // Eligible but no linked key yet — link FIRST, even at pending_add.
    if (room && room.member_pubkey === null) return 'link-required';
    // Linked + provisioning.
    if (room?.relay_state === 'pending_add') return 'provisioning';
    // Private room we can't read into.
    if (access === 'auth-required') return 'holder-required';
    // Not eligible / unresolved.
    return 'not-eligible';
  }, [canPost, room, access]);

  const banner = useMemo((): PostingBanner | null => {
    // Still resolving the eligible-rooms list: show a neutral "checking" state
    // rather than flashing a misleading "not eligible" gate (default-deny means
    // `readable` is false until the list resolves).
    if (roomsLoading && !room) {
      return {
        gate: 'provisioning',
        icon: Hash,
        tone: 'info',
        text: 'Checking access…',
        action: 'none',
      };
    }
    if (!gate) return null;
    const formattedThreshold = formatThresholdDigits(room?.min_token_threshold);
    const amount = formattedThreshold ? `${formattedThreshold} ` : '1 ';
    switch (gate) {
      case 'link-required':
        return {
          gate,
          icon: KeyRound,
          tone: 'gate',
          text: 'Link your Nostr key to post in this room.',
          action: 'link',
        };
      case 'provisioning':
        return {
          gate,
          icon: Hash,
          tone: 'info',
          text: 'Setting up your access… (this can take a moment)',
          action: 'none',
        };
      case 'holder-required':
        return {
          gate,
          icon: Lock,
          tone: 'lock',
          text: 'This is a private room — you must be a holding member to view or post.',
          action: 'none',
        };
      case 'not-eligible':
      default:
        return {
          gate,
          icon: Hash,
          tone: 'gate',
          text: `Hold ≥ ${amount}#${symbolLabel} to post in this room.`,
          action: 'buy',
          tokenAddress: room?.token_address,
        };
    }
  }, [gate, room, symbolLabel, roomsLoading]);

  return {
    gate,
    banner,
    requestLink,
    isLinking: linkStatus === 'linking',
    notifyTokenAcquired,
    refresh,
  };
}
