/**
 * X link changes the chain has confirmed but the API may not show yet.
 *
 * The indexer trails the node, so for a while after an unlink confirms, the
 * account record still lists the X handle. Anything that re-reads it in that
 * window (the profile editor does, every time it opens) would show the account
 * as linked again and offer to unlink it a second time. This remembers the
 * confirmed state per address until the API agrees, or until it is old enough
 * that the API is the better source again.
 *
 * In memory only: a reload starts clean, which is fine, since by then the
 * indexer has almost always caught up. It also means a note can never hide a
 * relink: linking X goes through X's sign-in page, a full-page redirect that
 * comes back to a fresh app.
 */

/** Long enough to cover indexer lag; short enough never to mask a real change. */
export const CONFIRMED_X_LINK_TTL_MS = 10 * 60_000;

type ConfirmedChange = { username: string | null; at: number };

const confirmed = new Map<string, ConfirmedChange>();

const normalize = (username: string | null | undefined) => (
  username ? username.replace(/^@/u, '').toLowerCase() : null
);

/** Record a link state the chain has confirmed: a handle, or null for unlinked. */
export function rememberConfirmedXLink(address: string, username: string | null): void {
  confirmed.set(address, { username: normalize(username), at: Date.now() });
}

/**
 * The X handle to show for `address`: what the API says, unless a change the
 * chain confirmed recently says otherwise. Stops overriding as soon as the API
 * agrees, so a later link or unlink made anywhere else shows normally.
 */
export function resolveXLink(address: string, apiUsername: string | null): string | null {
  const change = confirmed.get(address);
  if (!change) return apiUsername;
  if (Date.now() - change.at > CONFIRMED_X_LINK_TTL_MS) {
    confirmed.delete(address);
    return apiUsername;
  }
  if (normalize(apiUsername) === change.username) {
    confirmed.delete(address);
    return apiUsername;
  }
  // The API still shows the state from before the confirmed change.
  return change.username;
}

type LinkState = { linked: boolean; username: string | null };

/**
 * The X link state to render, given whatever the component last loaded.
 *
 * Read-only, unlike {@link resolveXLink}: it never clears the note, because
 * local state agreeing proves nothing. A load that started before the chain
 * confirmed can still land afterwards with the old handle; resolving here, on
 * every render, keeps the confirmed state no matter which write came last.
 */
export function effectiveXLink(address: string, loaded: LinkState): LinkState {
  const change = confirmed.get(address);
  if (!change || Date.now() - change.at > CONFIRMED_X_LINK_TTL_MS) return loaded;
  return { linked: change.username !== null, username: change.username };
}

/** Test helper. */
export function clearConfirmedXLinks(): void {
  confirmed.clear();
}
