import { matchRoutes, type RouteObject } from 'react-router-dom';

/** What an unknown, unmatched or unsafe path is reported as. */
export const OTHER_PAGE = '(other)';

const MAX_PAGE_LENGTH = 96;
// Same shape the API accepts. Anything else is reported as `(other)`.
const SAFE_PATTERN = /^\/[A-Za-z0-9/_:\-.()]*$/;
// Belt and braces: never let something that looks like a chain id or a hex hash out, even if
// a route were ever declared with a literal one in it.
const LOOKS_LIKE_ID = /(ak|ct|th|ok|nm)_[1-9A-HJ-NP-Za-km-z]{20,}|0x[0-9a-fA-F]{16,}/;

/** Join matched route `path`s into one pattern: `/` + `users/:address` -> `/users/:address`. */
export function joinRoutePaths(paths: Array<string | undefined>): string {
  const joined = paths
    .filter((p): p is string => typeof p === 'string' && p.length > 0)
    .join('/')
    .replace(/\/{2,}/g, '/')
    // optional segments (`:room?`) keep their name, the `?` is not part of the pattern
    .replace(/\?/g, '');
  const withLeadingSlash = joined.startsWith('/') ? joined : `/${joined}`;
  return withLeadingSlash.length > 1 ? withLeadingSlash.replace(/\/$/, '') : withLeadingSlash;
}

export function sanitizePattern(pattern: string): string {
  if (!pattern || pattern.length > MAX_PAGE_LENGTH) return OTHER_PAGE;
  if (!SAFE_PATTERN.test(pattern)) return OTHER_PAGE;
  if (LOOKS_LIKE_ID.test(pattern)) return OTHER_PAGE;
  return pattern;
}

/**
 * Map a real pathname to the app's route PATTERN. The real path is never returned: profile and
 * token URLs carry wallet addresses and names. Unmatched paths and the catch-all are `(other)`.
 */
export function toRoutePattern(pathname: string, routes: RouteObject[]): string {
  try {
    const matches = matchRoutes(routes, pathname || '/');
    if (!matches || matches.length === 0) return OTHER_PAGE;
    const paths = matches.map((m) => m.route.path);
    if (paths.some((p) => typeof p === 'string' && p.includes('*'))) return OTHER_PAGE;
    return sanitizePattern(joinRoutePaths(paths));
  } catch {
    return OTHER_PAGE;
  }
}
