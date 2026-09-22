import { useSyncExternalStore } from 'react';
import {
  pendingXLinkChange,
  subscribeXLinkChanges,
  xLinkChangesVersion,
  type PendingXLinkChange,
} from '@/utils/confirmedXLink';

/**
 * Re-render when an X link change starts, settles or is given up on, so views
 * that read `pendingXLinkChange` / `effectiveXLink` stay current even when the
 * change lands with no other state update, e.g. after the top banner has
 * moved on.
 */
export function useXLinkChanges(): number {
  return useSyncExternalStore(subscribeXLinkChanges, xLinkChangesVersion, xLinkChangesVersion);
}

/** The X link change for `address` still on its way to the API, kept current. */
export function usePendingXLinkChange(
  address: string | null | undefined,
): PendingXLinkChange | null {
  useXLinkChanges();
  return pendingXLinkChange(address);
}
