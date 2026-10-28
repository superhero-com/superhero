import {
  Contract, Encoding, isAddressValid, Node, decode, encode,
} from '@aeternity/aepp-sdk';
import { createHttpHeaders, type HttpClient } from '@azure/core-rest-pipeline';
import { CONFIG } from '@/config';
import type { Config } from './types';
import type { WalletMethod } from './shorts-wallet-journal';
import { shortsAe } from './shorts-pricing';
import { shortsContractPolicy } from './shorts-contract-policy';
import { ShortsDeadline } from './shorts-deadline';

export { shortsAe } from './shorts-pricing';

export type ArtifactIdentity = {
  compiler: string; sourceHash: string; bytecodeHash: string; aciHash: string;
};
export type ShortsRelease = ArtifactIdentity & {
  schemaVersion: 1 | 2; network: 'ae_uat' | 'ae_mainnet'; node: string; middleware: string;
  contract: string; previousContract: string | null; operator: string; treasury: string;
  likeFeeAetto: string; treasuryBps: number; previousArtifact?: ArtifactIdentity;
  storage?: { contract: string; sourceHash: string };
  rewardContracts?: (ArtifactIdentity & { contract: string })[];
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
  if (!v || ![1, 2].includes(v.schemaVersion) || !['ae_uat', 'ae_mainnet'].includes(v.network)
    || !isAddressValid(v.contract, Encoding.ContractAddress)
    || !isAddressValid(v.operator, Encoding.AccountAddress) || !isAddressValid(v.treasury, Encoding.AccountAddress)
    || !(v.previousContract === null || (v.previousContract !== v.contract
      && isAddressValid(v.previousContract, Encoding.ContractAddress)))
    || typeof v.likeFeeAetto !== 'string' || !/^(0|[1-9]\d{0,77})$/.test(v.likeFeeAetto)
    || (v.schemaVersion === 1 && v.likeFeeAetto === '0')
    || BigInt(v.likeFeeAetto) >= 2n ** 256n || !Number.isInteger(v.treasuryBps)
    || v.treasuryBps < 0 || v.treasuryBps > 10000) throw new Error('Invalid Shorts release configuration.');
  const identity = artifact(v);
  const previousArtifact = v.previousContract === null ? undefined : artifact(v.previousArtifact);
  if (v.previousContract === null && v.previousArtifact !== undefined) throw new Error('Unexpected previous Shorts artifact.');
  if (v.schemaVersion === 1 && (v.storage !== undefined || v.rewardContracts !== undefined)) throw new Error('Invalid legacy release identity.');
  const storage = v.storage === undefined ? undefined : { contract: v.storage?.contract, sourceHash: v.storage?.sourceHash };
  if (storage && (!isAddressValid(storage.contract, Encoding.ContractAddress) || !hexHash(storage.sourceHash))) throw new Error('Invalid Shorts storage identity.');
  if (v.rewardContracts !== undefined && (!Array.isArray(v.rewardContracts) || v.rewardContracts.length > 16)) throw new Error('Invalid reward contracts.');
  const seen = new Set([v.contract, v.previousContract]);
  const rewardContracts = v.rewardContracts?.map((item) => {
    if (!isAddressValid(item?.contract, Encoding.ContractAddress) || seen.has(item.contract)) throw new Error('Invalid reward contract identity.');
    seen.add(item.contract);
    return { contract: item.contract, ...artifact(item) };
  });
  return {
    schemaVersion: v.schemaVersion,
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
    ...(storage ? { storage } : {}),
    ...(rewardContracts ? { rewardContracts } : {}),
  };
}
async function verifiedAci(value: unknown, expected: string) {
  if (!Array.isArray(value) || !value.length) throw new Error('Shorts contract interface is unavailable.');
  const json = JSON.stringify(value);
  if (json.length > 1048576 || await shortsDigest(json) !== expected) throw new Error('Shorts contract interface does not match this release.');
  return JSON.parse(json) as unknown[];
}
function publicPolicy(p: Config['policy']) {
  if (!p) throw new Error('Shorts policy is unavailable. Refresh and try again.');
  const compact = p.treasury === null && p.likeFeeAetto === '0' && p.treasuryBps === 0;
  return shortsContractPolicy([{
    operator: p.operator,
    ...(compact ? {} : { treasury: p.treasury, like_fee: p.likeFeeAetto, treasury_bps: p.treasuryBps }),
    max_video_bytes: p.maxVideoBytes,
    max_comment_chars: p.maxCommentChars,
    max_comment_bytes: p.maxCommentBytes,
    comment_cooldown: p.commentCooldown,
    publishing_enabled: p.publishingEnabled,
    likes_enabled: p.likesEnabled,
    comments_enabled: p.commentsEnabled,
  }, p.version], 2);
}

export async function verifyShortsRelease(config: Config, expected: Trust = trust()) {
  if (!hexHash(expected.pin)) throw new Error('Wallet actions are not configured for this Shorts release.');
  const release = canonicalShortsRelease(config?.release);
  if (await shortsDigest(JSON.stringify(release)) !== expected.pin) throw new Error('This Shorts release does not match the website. Please refresh or contact support.');
  if (release.network !== 'ae_uat' || release.network !== expected.network
    || release.node !== expected.node.replace(/\/$/, '') || release.middleware !== expected.middleware.replace(/\/$/, '')
    || (release.schemaVersion === 1 && (release.likeFeeAetto !== '100000000000000000' || release.treasuryBps !== 2000))) throw new Error('Shorts network or payment configuration is not supported by this website.');
  const policy = release.schemaVersion === 2 ? publicPolicy(config.policy)
    : shortsContractPolicy([release.operator, release.treasury, release.likeFeeAetto, release.treasuryBps], 1);
  if (config.network !== release.network || config.contract !== release.contract
    || config.operator !== policy.operator || config.bytecodeHash !== release.bytecodeHash
    || config.likeFee !== shortsAe(policy.likeFeeAetto)
    || (config.previousContract || null) !== release.previousContract) throw new Error('Shorts payment details do not match the verified release.');
  const aci = await verifiedAci(config.aci, release.aciHash);
  const functions = (aci as { contract?: { functions?: { name: string; payable: boolean; stateful: boolean; arguments: { type: unknown }[] }[] } }[])
    .flatMap((entry) => entry.contract?.functions || []);
  const like = functions.find((fn) => fn.name === 'like');
  const freeLikes = release.schemaVersion === 2 && policy.likeFeeAetto === '0'
    && !!like && like.payable === false && like.stateful === true
    && JSON.stringify(like.arguments.map((arg) => arg.type)) === JSON.stringify(['string', 'int'])
    && !functions.some((fn) => fn.name === 'paid_like');
  const previousAci = release.previousArtifact ? await verifiedAci(config.previousAci, release.previousArtifact.aciHash) : undefined;
  const rewardContracts = await Promise.all((release.rewardContracts || []).map(async (identity) => ({
    ...identity, aci: await verifiedAci(config.rewardContracts?.find((item) => item.contract === identity.contract)?.aci, identity.aciHash),
  })));
  return {
    release, aci, previousAci, rewardContracts, policy, freeLikes,
  };
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
        if (response.ok && url.pathname === '/v3/dry-run') {
          const input = JSON.parse(request.body as string);
          const output = JSON.parse(text);
          if (!Array.isArray(input.txs) || !Array.isArray(output.results)
            || output.results.length !== input.txs.length) {
            throw new Error('Shorts verification returned an incomplete result. No transaction was sent.');
          }
        }
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
  if (method === 'paid_like' || (method === 'like' && !verified.freeLikes)) {
    throw new Error('This release does not support free Likes. Refresh after the contract upgrade.');
  }
  if (context.onNode?.$host.replace(/\/$/, '') !== release.node) throw new Error('Your wallet connection is using a different node. Reconnect before continuing.');
  const reward = verified.rewardContracts.find((item) => item.contract === target);
  const previous = target === release.previousContract || !!reward;
  if (method === 'claim' && !previous && verified.freeLikes) throw new Error('Free Likes do not generate rewards to claim.');
  if ((!previous && target !== release.contract) || (previous && method !== 'claim')
    || amount !== '0') throw new Error('Wallet action does not match the reviewed Shorts transaction.');
  assertCurrent();
  const deadline = new ShortsDeadline('Shorts verification timed out. No transaction was sent.');
  const node = new Node(release.node, { retryCount: 0, httpClient: releaseTransport(release.node, deadline.signal) });
  const active = () => { deadline.signal.throwIfAborted(); assertCurrent(); };
  const verify = async () => {
    if ((await node.getStatus()).networkId !== release.network) throw new Error('Shorts node is on a different network.');
    active();
    const code = await node.getContractCode(release.contract);
    if (await shortsDigest(code.bytecode) !== release.bytecodeHash) throw new Error('Shorts contract code does not match this release.');
    active();
    const contract = await Contract.initialize({ onNode: node, aci: verified.aci as any, address: release.contract as `ct_${string}` });
    const { decodedResult: cfg } = await contract.$call('get_config', [], { callStatic: true });
    active();
    const policy = shortsContractPolicy(cfg, release.schemaVersion);
    if (!previous && JSON.stringify(policy) !== JSON.stringify(verified.policy)) throw new Error('Shorts settings have changed. Refresh before signing.');
    if ((method === 'like' && !policy.likesEnabled) || (method === 'add_comment' && !policy.commentsEnabled)) throw new Error('This action is temporarily paused.');
    let predecessor;
    if (release.schemaVersion === 2) {
      const { decodedResult: [native, legacy] } = await contract.$call('get_import_source', [], { callStatic: true });
      const source = native || legacy?.source;
      predecessor = source ? encode(decode(source), Encoding.ContractAddress) : null;
      if (!previous && method !== 'claim') {
        const { decodedResult: status } = await contract.$call('migration_status', [], { callStatic: true });
        if (BigInt(status.schema) !== 2n || status.frozen || status.importing || status.abandoned) throw new Error('Shorts is being upgraded. Try again shortly.');
      }
    } else predecessor = (await contract.$call('get_previous', [], { callStatic: true })).decodedResult;
    active();
    if ((predecessor || null) !== release.previousContract) throw new Error('Previous Shorts contract does not match this release.');
    if (previous) {
      const old = await node.getContractCode(target);
      if (await shortsDigest(old.bytecode) !== (reward || release.previousArtifact)!.bytecodeHash) throw new Error('Previous Shorts contract code does not match this release.');
    }
    if ((await node.getStatus()).networkId !== release.network) throw new Error('Shorts node network changed during verification.');
    active();
    return { ...verified, aci: reward?.aci || (previous ? verified.previousAci! : verified.aci) };
  };
  try { return await deadline.wait(verify()); } finally { deadline.close(); }
}
