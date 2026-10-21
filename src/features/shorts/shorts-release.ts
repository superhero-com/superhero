import {
  Contract, Encoding, isAddressValid, Node,
} from '@aeternity/aepp-sdk';
import { createHttpHeaders, type HttpClient } from '@azure/core-rest-pipeline';
import { CONFIG } from '@/config';
import type { Config } from './types';
import type { WalletMethod } from './shorts-wallet-journal';
import { shortsAe } from './shorts-pricing';

export { shortsAe } from './shorts-pricing';

export type ArtifactIdentity = {
  compiler: string; sourceHash: string; bytecodeHash: string; aciHash: string;
};
export type ShortsRelease = ArtifactIdentity & {
  schemaVersion: 1; network: 'ae_uat' | 'ae_mainnet'; node: string; middleware: string;
  contract: string; previousContract: string | null; operator: string; treasury: string;
  likeFeeAetto: string; treasuryBps: number; previousArtifact?: ArtifactIdentity;
};
type Trust = { pin: string; network: string; node: string; middleware: string };
const trust = (): Trust => ({
  pin: import.meta.env.VITE_SHORTS_RELEASE_HASH || '',
  network: CONFIG.NETWORK,
  node: CONFIG.NODE_URL,
  middleware: CONFIG.MIDDLEWARE_URL,
});
const hexHash = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
export const shortsDigest = async (value: string) => {
  const result = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(result), (b) => b.toString(16).padStart(2, '0')).join('');
};
function artifact(value: unknown): ArtifactIdentity {
  const v = value as ArtifactIdentity;
  if (!v || typeof v.compiler !== 'string' || !/^\d+\.\d+\.\d+$/.test(v.compiler)
    || ![v.sourceHash, v.bytecodeHash, v.aciHash].every(hexHash)) throw new Error('Invalid Shorts artifact identity.');
  return {
    compiler: v.compiler, sourceHash: v.sourceHash, bytecodeHash: v.bytecodeHash, aciHash: v.aciHash,
  };
}
function endpoint(value: string, origin: boolean) {
  if (typeof value !== 'string' || value.length > 2048) throw new Error('Invalid Shorts release endpoint.');
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash
    || (url.protocol !== 'https:' && !(import.meta.env.DEV && url.protocol === 'http:'
      && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)))
    || value !== (origin ? url.origin : url.href.replace(/\/$/, ''))) throw new Error('Invalid Shorts release endpoint.');
  return value;
}
/** Field order is the API's schemaVersion 1 canonical identity, not receipt metadata. */
export function canonicalShortsRelease(value: unknown): ShortsRelease {
  const v = value as ShortsRelease;
  if (!v || v.schemaVersion !== 1 || !['ae_uat', 'ae_mainnet'].includes(v.network)
    || !isAddressValid(v.contract, Encoding.ContractAddress)
    || !isAddressValid(v.operator, Encoding.AccountAddress) || !isAddressValid(v.treasury, Encoding.AccountAddress)
    || !(v.previousContract === null || (v.previousContract !== v.contract
      && isAddressValid(v.previousContract, Encoding.ContractAddress)))
    || typeof v.likeFeeAetto !== 'string' || !/^[1-9]\d{0,77}$/.test(v.likeFeeAetto)
    || BigInt(v.likeFeeAetto) >= 2n ** 256n || !Number.isInteger(v.treasuryBps)
    || v.treasuryBps < 0 || v.treasuryBps > 10000) throw new Error('Invalid Shorts release configuration.');
  const identity = artifact(v);
  const previousArtifact = v.previousContract === null ? undefined : artifact(v.previousArtifact);
  if (v.previousContract === null && v.previousArtifact !== undefined) throw new Error('Unexpected previous Shorts artifact.');
  return {
    schemaVersion: 1,
    network: v.network,
    node: endpoint(v.node, true),
    middleware: endpoint(v.middleware, false),
    contract: v.contract,
    previousContract: v.previousContract,
    operator: v.operator,
    treasury: v.treasury,
    ...identity,
    likeFeeAetto: v.likeFeeAetto,
    treasuryBps: v.treasuryBps,
    ...(previousArtifact ? { previousArtifact } : {}),
  };
}
async function verifiedAci(value: unknown, expected: string) {
  if (!Array.isArray(value) || !value.length) throw new Error('Shorts contract interface is unavailable.');
  const json = JSON.stringify(value);
  if (json.length > 1048576 || await shortsDigest(json) !== expected) throw new Error('Shorts contract interface does not match this release.');
  return JSON.parse(json) as unknown[];
}
export async function verifyShortsRelease(config: Config, expected: Trust = trust()) {
  if (!hexHash(expected.pin)) throw new Error('Wallet actions are not configured for this Shorts release.');
  const release = canonicalShortsRelease(config?.release);
  if (await shortsDigest(JSON.stringify(release)) !== expected.pin) throw new Error('This Shorts release does not match the website. Please refresh or contact support.');
  if (release.network !== 'ae_uat' || release.network !== expected.network
    || release.node !== expected.node.replace(/\/$/, '') || release.middleware !== expected.middleware.replace(/\/$/, '')
    || release.likeFeeAetto !== '100000000000000000' || release.treasuryBps !== 2000) throw new Error('Shorts network or payment configuration is not supported by this website.');
  if (config.network !== release.network || config.contract !== release.contract
    || config.operator !== release.operator || config.bytecodeHash !== release.bytecodeHash
    || config.likeFee !== shortsAe(release.likeFeeAetto)
    || (config.previousContract || null) !== release.previousContract) throw new Error('Shorts payment details do not match the verified release.');
  const aci = await verifiedAci(config.aci, release.aciHash);
  const previousAci = release.previousArtifact ? await verifiedAci(config.previousAci, release.previousArtifact.aciHash) : undefined;
  return { release, aci, previousAci };
}

/** Independent, bounded read-only transport. No wallet/account or ambient credentials. */
function releaseTransport(origin: string, signal: AbortSignal): HttpClient {
  return {
    async sendRequest(request) {
      const url = new URL(request.url);
      if (url.origin !== origin || url.username || url.password || !url.pathname.startsWith('/v3/')
        || !['GET', 'POST'].includes(request.method)
        || (request.method === 'POST' && url.pathname !== '/v3/dry-run')
        || (request.body != null && (typeof request.body !== 'string' || request.body.length > 131072))) throw new Error('Shorts verification request is outside its authority.');
      const response = await fetch(url, {
        method: request.method,
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: request.body as string | undefined,
        credentials: 'omit',
        redirect: 'error',
        signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
      });
      if (Number(response.headers.get('content-length') || 0) > 1048576) {
        await response.body?.cancel(); throw new Error('Shorts verification response is too large.');
      }
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let text = '';
      let bytes = 0;
      try {
        if (reader) {
          for (;;) {
            // Sequential reads enforce the byte limit before buffering another chunk.
            // eslint-disable-next-line no-await-in-loop
            const { done, value } = await reader.read();
            if (done) break;
            bytes += value.byteLength;
            if (bytes > 1048576) throw new Error('Shorts verification response is too large.');
            text += decoder.decode(value, { stream: true });
          }
          text += decoder.decode();
        }
        signal.throwIfAborted();
        return {
          request, status: response.status, headers: createHttpHeaders(Object.fromEntries(response.headers)), bodyAsText: text,
        };
      } finally {
        await reader?.cancel().catch(() => undefined); reader?.releaseLock();
      }
    },
  };
}

export async function verifyShortsWalletTarget(
  context: Parameters<typeof Contract.initialize>[0],
  config: Config,
  target: string,
  method: WalletMethod,
  amount: string,
  assertCurrent: () => void,
) {
  const verified = await verifyShortsRelease(config);
  const { release } = verified;
  if (context.onNode?.$host.replace(/\/$/, '') !== release.node) throw new Error('Your wallet connection is using a different node. Reconnect before continuing.');
  const previous = target === release.previousContract;
  if ((!previous && target !== release.contract) || (previous && method !== 'claim')
    || amount !== (method === 'paid_like' ? release.likeFeeAetto : '0')) throw new Error('Wallet action does not match the reviewed Shorts payment.');
  assertCurrent();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  const node = new Node(release.node, { retryCount: 0, httpClient: releaseTransport(release.node, controller.signal) });
  const active = () => { controller.signal.throwIfAborted(); assertCurrent(); };
  try {
    if ((await node.getStatus()).networkId !== release.network) throw new Error('Shorts node is on a different network.');
    active();
    const code = await node.getContractCode(release.contract);
    if (await shortsDigest(code.bytecode) !== release.bytecodeHash) throw new Error('Shorts contract code does not match this release.');
    active();
    const contract = await Contract.initialize({ onNode: node, aci: verified.aci as any, address: release.contract as `ct_${string}` });
    const { decodedResult: cfg } = await contract.$call('get_config', [], { callStatic: true });
    active();
    if (!Array.isArray(cfg) || cfg.length !== 4 || cfg[0] !== release.operator || cfg[1] !== release.treasury
      || String(cfg[2]) !== release.likeFeeAetto || String(cfg[3]) !== String(release.treasuryBps)) throw new Error('Shorts payment configuration has changed.');
    const { decodedResult: predecessor } = await contract.$call('get_previous', [], { callStatic: true });
    active();
    if ((predecessor || null) !== release.previousContract) throw new Error('Previous Shorts contract does not match this release.');
    if (previous) {
      const old = await node.getContractCode(target);
      if (await shortsDigest(old.bytecode) !== release.previousArtifact!.bytecodeHash) throw new Error('Previous Shorts contract code does not match this release.');
    }
    if ((await node.getStatus()).networkId !== release.network) throw new Error('Shorts node network changed during verification.');
    active();
    return { ...verified, aci: previous ? verified.previousAci! : verified.aci };
  } finally { clearTimeout(timer); controller.abort(); }
}
