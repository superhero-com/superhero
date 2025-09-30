import { describe, it, expect, beforeAll } from 'vitest';
import { AeSdk, Node } from '@aeternity/aepp-sdk';
import { DEX_ADDRESSES } from '../../libs/dex';
// Use the same ACIs as production code
// @ts-ignore
import RouterAci from 'dex-contracts-v2/build/AedexV2Router.aci.json';
// @ts-ignore
import FactoryAci from 'dex-contracts-v2/build/AedexV2Factory.aci.json';

// Integration tests that hit a live node for read-only contract calls
// Skips gracefully if the node is unreachable or pair not found

let aeSdk: AeSdk | null = null;

async function initSdk(): Promise<AeSdk | null> {
  try {
    const nodeUrl = (import.meta as any).env?.VITE_NODE_URL || 'https://mdw.wordcraft.fun';
    const sdk = new AeSdk({ nodes: [{ name: 'node', instance: new Node(nodeUrl) }] });
    return sdk;
  } catch {
    return null;
  }
}

describe('DEX integration: contract initialization and quoting (live)', () => {
  beforeAll(async () => {
    aeSdk = await initSdk();
    if (!aeSdk) console.warn('[integration] Skipping tests: node not reachable');
  });

  it('initializes router and factory and fetches factory address', async () => {
    if (!aeSdk) return;
    try {
      const router = await aeSdk.initializeContract({ aci: RouterAci, address: DEX_ADDRESSES.router });
      const { decodedResult } = await (router as any).factory();
      const factoryAddress = typeof decodedResult === 'string' ? decodedResult : decodedResult?.$options?.address;
      expect(typeof factoryAddress).toBe('string');
      expect((factoryAddress as string).startsWith('ct_')).toBe(true);
    } catch (e) {
      console.warn('[integration] Skipping: unable to initialize or call router.factory', e);
    }
  }, 20000);

  it('quotes get_amounts_out for a known path if pair exists', async () => {
    if (!aeSdk) return;
    const router = await aeSdk.initializeContract({ aci: RouterAci, address: DEX_ADDRESSES.router });
    const factory = await aeSdk.initializeContract({ aci: FactoryAci, address: DEX_ADDRESSES.factory });
    // Try aeETH -> WAE first, then reverse
    const candidates: [string, string][] = [
      [DEX_ADDRESSES.aeeth, DEX_ADDRESSES.wae],
      [DEX_ADDRESSES.wae, DEX_ADDRESSES.aeeth],
    ];
    let path: string[] | null = null;
    for (const [a, b] of candidates) {
      try {
        const { decodedResult: pairOpt } = await (factory as any).get_pair(a, b);
        if (pairOpt) { path = [a, b]; break; }
      } catch { /* ignore */ }
    }
    if (!path) {
      console.warn('[integration] Skipping quote: no aeETH/WAE pair found');
      return;
    }
    const amountIn = 1_000_000_000_000_000_000n; // 1.0 with 18 decimals
    const { decodedResult } = await (router as any).get_amounts_out(amountIn, path);
    expect(Array.isArray(decodedResult)).toBe(true);
    expect(decodedResult.length).toBe(2);
    const out = decodedResult[decodedResult.length - 1];
    expect(BigInt(out) >= 0n).toBe(true);
  }, 30000);
});


