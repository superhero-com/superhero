import { useSyncExternalStore } from 'react';
import { subscribeXLinkChanges, xLinkChangesVersion } from '@/utils/confirmedXLink';

/**
 * Re-render when an X unlink is tracked or confirmed, so views that read
 * `pendingXUnlink` / `effectiveXLink` stay current even when the change lands
 * with no other state update, e.g. after the top banner has moved on.
 */
export function useXLinkChanges(): number {
  return useSyncExternalStore(subscribeXLinkChanges, xLinkChangesVersion, xLinkChangesVersion);
}
