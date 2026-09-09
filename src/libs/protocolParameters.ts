import { defaultProtocolParameters } from '@aeternity/aepp-sdk';

/**
 * aepp-sdk 15 sizes a fee at the node's consensus gas price (1e6) but prices it at the miner's
 * (1e9). The larger fee takes one more byte, so every transaction comes out 20 gas short and the
 * node rejects it with `too_low_gas_price_for_miner`. The shipped parameters put both at 1e9.
 * Drop once the SDK sizes at the price it charges — the canary test fails then.
 */
export const PINNED_PROTOCOL_PARAMETERS = defaultProtocolParameters;
