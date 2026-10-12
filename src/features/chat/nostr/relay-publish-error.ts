/**
 * Typed error for a publish that no write relay accepted, split out of
 * `nostr-client.ts` to keep one class per file. It keeps each relay's own reason
 * (the text of its `OK false`, or the pool's `connection failure: …` when the
 * socket never opened) so the user sees why a send failed instead of a generic
 * "all relays rejected the event".
 */

/** One write relay that did not accept a publish, and the reason it gave. */
export interface RelayRejection {
  relay: string;
  reason: string;
}

/** Prefix `SimplePool.publish` puts on the reason for a relay it could not reach. */
const CONNECTION_FAILURE = 'connection failure: ';

/** `wss://relay.example/` → `relay.example`, for a readable message. */
function relayHost(url: string): string {
  try {
    return new URL(url).host || url;
  } catch {
    return url;
  }
}

function isConnectionFailure(rejection: RelayRejection): boolean {
  return rejection.reason.startsWith(CONNECTION_FAILURE);
}

function describeRejections(rejections: RelayRejection[]): string {
  const details = rejections
    .map((r) => {
      const reason = isConnectionFailure(r) ? r.reason.slice(CONNECTION_FAILURE.length) : r.reason;
      return `${relayHost(r.relay)}: ${reason || 'no reason given'}`;
    })
    .join('; ');
  if (rejections.length > 0 && rejections.every(isConnectionFailure)) {
    return `The chat relay is not reachable right now (${details}). Please try again in a moment.`;
  }
  return `The chat relay did not accept this (${details}).`;
}

/** Thrown when every write relay rejected a publish or could not be reached. */
export class RelayPublishError extends Error {
  readonly rejections: RelayRejection[];

  constructor(rejections: RelayRejection[]) {
    super(describeRejections(rejections));
    this.name = 'RelayPublishError';
    this.rejections = rejections;
  }

  /** No relay could be reached at all (DNS, TLS, timeout), so none could answer. */
  get isConnectionFailure(): boolean {
    return this.rejections.length > 0 && this.rejections.every(isConnectionFailure);
  }
}
