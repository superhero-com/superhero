import type { JourneyEvent } from './events';

/** Route patterns that also count as a step of their own. */
export const PROFILE_PATTERNS: ReadonlySet<string> = new Set(['/users/:address']);
export const TOKEN_SALE_PATTERNS: ReadonlySet<string> = new Set(['/trends/tokens/:tokenName']);

/** Events to record when a page with this pattern is opened. */
export function pageViewEvents(pattern: string): JourneyEvent[] {
  const events: JourneyEvent[] = ['page_view'];
  if (PROFILE_PATTERNS.has(pattern)) events.push('profile_view');
  if (TOKEN_SALE_PATTERNS.has(pattern)) events.push('token_view');
  return events;
}
