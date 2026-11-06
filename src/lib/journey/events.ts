/**
 * Closed list of user journey steps. The API keeps the same list and drops anything else,
 * so a new name has to land in both repos (superhero-api `src/journey`).
 *
 * An event is only ever: this name, the route pattern it happened on, and a timestamp.
 * Never add a field that could tie it to a wallet, an X handle, a name, a token or a post.
 */
export const JOURNEY_EVENTS = [
  'page_view',
  // Profile / onboarding flow, in the order people walk it.
  'profile_view',
  'profile_edit_open',
  'claim_account_open',
  'claim_account_done',
  'x_connect_start',
  'x_connected',
  'post_created',
  'token_created',
  // Wallet
  'wallet_connect_open',
  'wallet_connected',
  'wallet_created',
  // Trade / DeFi
  'token_view',
  'token_buy_done',
  'token_sell_done',
  'swap_done',
  'liquidity_added',
  // Social
  'tip_sent',
  'reply_created',
  // Chat / governance
  'chat_message_sent',
  'governance_vote_done',
] as const;

export type JourneyEvent = typeof JOURNEY_EVENTS[number];

const EVENT_SET: ReadonlySet<string> = new Set(JOURNEY_EVENTS);

export const isJourneyEvent = (name: unknown): name is JourneyEvent => (
  typeof name === 'string' && EVENT_SET.has(name)
);
