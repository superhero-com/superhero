import { act, renderHook, waitFor } from '@testing-library/react';
import { createHash, webcrypto } from 'node:crypto';
import { Buffer } from 'node:buffer';
import {
  beforeEach, expect, it, vi,
} from 'vitest';
import {
  AccountMemory, AeSdkAepp, BrowserRuntimeConnection, buildTx, buildTxHash,
  decode, encode, Encoding, Node, RpcRejectedByUserError, Tag, unpackTx,
} from '@aeternity/aepp-sdk';
import type { SUBSCRIPTION_TYPES } from '@aeternity/aepp-sdk';
import { AciContractCallEncoder, ContractByteArrayEncoder, TypeResolver } from '@aeternity/aepp-calldata';
import type { Config } from '../types';
import { useShortsWalletTransactions, WalletActionPending } from '../use-shorts-wallet-transactions';
import type { WalletAction } from '../shorts-wallet-journal';

const mocks = vi.hoisted(() => ({
  rows: new Map<string, unknown>(), request: vi.fn(), rejectSubmissionWrite: false,
}));
vi.mock('../shorts-wallet-journal', async (original) => {
  const actual = await original<typeof import('../shorts-wallet-journal')>();
  return {
    ...actual,
    WalletJournal: class extends actual.WalletJournal {
      constructor() {
        super({
          change: async (scope, edit) => {
            const key = actual.walletScopeKey(scope);
            const value = edit(structuredClone(mocks.rows.get(key)));
            if (mocks.rejectSubmissionWrite && value?.submission === 'attempted') {
              throw new Error('Submission checkpoint could not be saved');
            }
            if (value) mocks.rows.set(key, structuredClone(value));
            else mocks.rows.delete(key);
            return value;
          },
        });
      }
    },
  };
});
vi.mock('@/config', () => ({ CONFIG: { NETWORK: 'ae_uat', NODE_URL: 'https://node.invalid', MIDDLEWARE_URL: 'https://node.invalid/mdw' } }));
vi.mock('../api', () => ({ SHORTS_API: 'https://api.example', request: mocks.request }));

const aci = [{
  contract: {
    name: 'Shorts',
    kind: 'contract_main',
    typedefs: [],
    functions: [
      {
        name: 'get_config', arguments: [], returns: { tuple: ['address', 'address', 'int', 'int'] }, payable: false, stateful: false,
      },
      {
        name: 'get_previous', arguments: [], returns: { option: ['contract_pubkey'] }, payable: false, stateful: false,
      },
      {
        name: 'claim', arguments: [], returns: { tuple: [] }, payable: false, stateful: true,
      },
      {
        name: 'like',
        arguments: [{ name: 'id', type: 'string' }],
        returns: { tuple: [] },
        payable: false,
        stateful: true,
      }],
  },
}];
const cfgType = {
  record: [
    { name: 'operator', type: 'address' },
    ...['max_video_bytes', 'max_comment_chars', 'max_comment_bytes', 'comment_cooldown'].map((name) => ({ name, type: 'int' })),
    ...['publishing_enabled', 'likes_enabled', 'comments_enabled'].map((name) => ({ name, type: 'bool' })),
  ],
};
const statusType = { record: [{ name: 'schema', type: 'int' }, ...['importing', 'frozen', 'abandoned'].map((name) => ({ name, type: 'bool' }))] };
const sourceType = { tuple: [{ option: ['address'] }, { option: [{ record: [{ name: 'source', type: 'address' }, { name: 'cutoff_height', type: 'int' }] }] }] };
const v2Aci = [{
  contract: {
    ...aci[0].contract,
    functions: [
      ...aci[0].contract.functions.filter((f) => !['get_previous', 'claim'].includes(f.name)).map((f) => {
        if (f.name === 'get_config') return { ...f, returns: { tuple: [cfgType, 'int'] } };
        if (f.name === 'like') return { ...f, arguments: [...f.arguments, { name: 'version', type: 'int' }] };
        return f;
      }),
      {
        name: 'get_import_source', arguments: [], returns: sourceType, stateful: false, payable: false,
      },
      {
        name: 'migration_status', arguments: [], returns: statusType, stateful: false, payable: false,
      },
      ...Object.entries({ add_comment: ['string', 'string', 'int', 'int'] }).map(([name, types]) => ({
        name, arguments: types.map((type, i) => ({ name: `arg${i}`, type })), returns: { tuple: [] }, stateful: true, payable: false,
      })),
    ],
  },
}];
const saved = () => [...mocks.rows.values()][0] as WalletAction | undefined;

// Real SDK Contract.$call, transaction building, dry-run, signing and validation.
// Only transport is simulated. Every URL is handled here; nothing reaches a node.
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
function fixture(previous = false, v2 = true) {
  const abi = v2 ? v2Aci : aci;
  const account = AccountMemory.generate();
  const contract = encode(new Uint8Array(32).fill(9), Encoding.ContractAddress);
  const previousContract = previous ? encode(new Uint8Array(32).fill(8), Encoding.ContractAddress) : null;
  const bytecode = encode(new Uint8Array(32).fill(7), Encoding.ContractBytearray);
  const identity = {
    compiler: '8.0.0', sourceHash: 'a'.repeat(64), bytecodeHash: digest(bytecode), aciHash: digest(JSON.stringify(abi)),
  };
  const release = {
    schemaVersion: v2 ? 2 as const : 1 as const,
    network: 'ae_uat' as const,
    node: 'https://node.invalid',
    middleware: 'https://node.invalid/mdw',
    contract,
    previousContract,
    operator: account.address,
    treasury: account.address,
    ...identity,
    likeFeeAetto: '0',
    treasuryBps: 0,
    ...(previous ? { previousArtifact: { ...identity, aciHash: digest(JSON.stringify(aci)) } } : {}),
  };
  const config = {
    release,
    network: release.network,
    contract,
    operator: release.operator,
    bytecodeHash: release.bytecodeHash,
    likeFee: '0',
    aci: abi,
    likeMode: 'free',
    likeSponsorship: {
      enabled: true, gasLimit: 100000, gasPrice: '1000000000', maxFee: '1000000000000000', ttlBlocks: 10,
    },
    ...(previous ? { previousContract, previousAci: aci } : {}),
  } as Config;
  vi.stubEnv('VITE_SHORTS_RELEASE_HASH', digest(JSON.stringify(release)));
  const calls: string[] = [];
  const state = {
    network: 'ae_uat',
    bytecode,
    previous: previousContract,
    cfg: v2 ? [{
      operator: account.address,
      max_video_bytes: 100000000n,
      max_comment_chars: 280n,
      max_comment_bytes: 1120n,
      comment_cooldown: 1n,
      publishing_enabled: true,
      likes_enabled: true,
      comments_enabled: true,
    }, 3n] as unknown[]
      : [account.address, account.address, BigInt(release.likeFeeAetto), 2000n] as unknown[],
    lifecycle: {
      schema: 2n, importing: false, frozen: false, abandoned: false,
    },
    beforePreflight: undefined as undefined | (() => Promise<void>),
    beforeNonce: undefined as undefined | (() => Promise<void>),
    emptyDryRun: false,
    insufficientBalanceAfterSigning: false,
    losePostResponse: false,
    beforeVerification: undefined as undefined | (() => Promise<void>),
    submitted: [] as string[],
    signed: false,
  };
  if (v2) {
    config.policy = {
      version: '3',
      operator: account.address,
      treasury: null,
      likeFeeAetto: release.likeFeeAetto,
      treasuryBps: 0,
      maxVideoBytes: 100000000,
      maxCommentChars: 280,
      maxCommentBytes: 1120,
      commentCooldown: 1,
      publishingEnabled: true,
      likesEnabled: true,
      commentsEnabled: true,
    };
  }
  const unitType = new TypeResolver().resolveType({ tuple: [] });
  const unit = new ContractByteArrayEncoder().encodeWithType([], unitType);
  const resultFor = (callData: string) => {
    const coder = new AciContractCallEncoder(abi);
    const encoder = new ContractByteArrayEncoder();
    const resolver = new TypeResolver();
    if (callData === coder.encodeCall('Shorts', 'get_config', [])) {
      return encoder.encodeWithType(state.cfg, resolver.resolveType(v2 ? { tuple: [cfgType, 'int'] } : { tuple: ['address', 'address', 'int', 'int'] }));
    }
    if (v2 && callData === coder.encodeCall('Shorts', 'get_import_source', [])) return encoder.encodeWithType([null, state.previous ? { source: encode(decode(state.previous), Encoding.AccountAddress), cutoff_height: 0n } : null], resolver.resolveType(sourceType));
    if (v2 && callData === coder.encodeCall('Shorts', 'migration_status', [])) return encoder.encodeWithType(state.lifecycle, resolver.resolveType(statusType));
    if (!v2 && callData === coder.encodeCall('Shorts', 'get_previous', [])) {
      return encoder.encodeWithType(state.previous, resolver.resolveType({ option: ['contract_pubkey'] }));
    }
    return unit;
  };
  const node = new Node('https://node.invalid', { retryCount: 0 });
  const respond = async (request: { url: string; body?: unknown; method: string }) => {
    const url = new URL(request.url);
    expect(url.origin).toBe('https://node.invalid');
    calls.push(`${request.method} ${url.pathname}`);
    const body = typeof request.body === 'string' ? JSON.parse(request.body) : undefined;
    let value: unknown;
    if (url.pathname === '/v3/status') {
      value = {
        node_version: '7.2.0',
        network_id: state.network,
        top_block_height: 100,
        protocols: [{ version: 6, effective_at_height: 0 }],
      };
    } else if (url.pathname === '/v3/headers/top') value = { height: 100, hash: encode(new Uint8Array(32).fill(2), Encoding.KeyBlockHash), time: Date.now() };
    else if (url.pathname.endsWith('/code')) {
      await state.beforePreflight?.();
      value = { bytecode: state.bytecode };
    } else if (url.pathname.endsWith('/next-nonce')) {
      await state.beforeNonce?.();
      value = { next_nonce: 1 };
    } else if (url.pathname.startsWith('/v3/accounts/')) {
      if (state.signed) await state.beforeVerification?.();
      value = {
        id: account.address,
        nonce: 0,
        kind: 'basic',
        balance: state.signed && state.insufficientBalanceAfterSigning
          ? '0' : '100000000000000000000',
      };
    } else if ([contract, previousContract].some((id) => url.pathname === `/v3/contracts/${id}`)) {
      value = {
        id: contract,
        active: true,
        owner_id: account.address,
        vm_version: 8,
        abi_version: 3,
        referrer_ids: [],
      };
    } else if (url.pathname === '/v3/recent-gas-prices') {
      value = [{ min_gas_price: 1000000000, utilization: 0, minutes: 1 }];
    } else if (url.pathname === '/v3/key-blocks/current/height') value = { height: 100 };
    else if (url.pathname === '/v3/dry-run') {
      value = {
        results: (state.emptyDryRun ? [] : body.txs).map(({ tx }: { tx: `tx_${string}` }) => {
          const call = unpackTx(tx, Tag.ContractCallTx);
          return {
            type: 'contract_call',
            result: 'ok',
            call_obj: {
              caller_id: call.callerId,
              caller_nonce: call.nonce,
              contract_id: contract,
              height: 100,
              gas_price: 1000000000,
              gas_used: 1000,
              log: [],
              return_type: 'ok',
              return_value: resultFor(call.callData),
            },
          };
        }),
      };
    } else if (url.pathname === '/v3/transactions' && request.method === 'POST') {
      expect(saved()?.tx).toBe(buildTxHash(body.tx));
      expect(saved()?.submission).toBe('attempted');
      state.submitted.push(body.tx);
      if (state.losePostResponse) throw new Error('Connection lost after accepting transaction');
      value = { tx_hash: buildTxHash(body.tx) };
    } else throw new Error(`Unexpected SDK request: ${request.method} ${url.pathname}`);
    return JSON.stringify(value);
  };
  vi.stubGlobal('fetch', vi.fn(async (url: URL, options: RequestInit) => new Response(await respond({ url: String(url), ...options, method: options.method! }), { headers: { 'content-type': 'application/json' } })));
  node.pipeline.addPolicy({
    name: 'owned-wallet-fixture-transport',
    sendRequest: async (request) => {
      const bodyAsText = await respond(request);
      request.headers.set('content-type', 'application/json');
      return {
        request,
        status: 200,
        headers: request.headers,
        bodyAsText,
      };
    },
  }, { afterPhase: 'Sign' });
  const sign = vi.spyOn(account, 'signTransaction').mockImplementation(async (tx, options) => {
    const raw = await AccountMemory.prototype.signTransaction.call(account, tx, options);
    state.signed = true;
    return raw;
  });
  const sdk = {
    address: account.address,
    getContext: () => ({ onNode: node, onAccount: account }),
  };
  const options = {
    sponsorToken: async () => 'session', actor: account.address, network: 'ae_uat', contract, previousContract: previousContract || undefined, onConfirmed: vi.fn(),
  };
  return {
    account, contract, state, sign, sdk, options, node, config, calls,
  };
}
const execute = (
  hook: ReturnType<typeof renderHook<ReturnType<typeof useShortsWalletTransactions>, unknown>>,
  f: ReturnType<typeof fixture>,
) => hook.result.current.run(
  f.sdk,
  'like',
  'owned-sdk-fixture',
  '0',
  f.config,
  f.contract,
  vi.fn(),
  undefined,
  'session',
);
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('crypto', webcrypto);
  vi.stubGlobal('Uint8Array', Object.getPrototypeOf(Buffer.prototype).constructor);
  mocks.rows.clear();
  mocks.rejectSubmissionWrite = false;
  mocks.request.mockImplementation(async () => ({
    ...saved(), sponsored: true, status: 'unknown', confirmationsRequired: 3, confirmations: 0,
  }));
});

it('rejects an empty successful dry-run response without preparing or signing', async () => {
  const f = fixture();
  f.state.emptyDryRun = true;
  const hook = renderHook(() => useShortsWalletTransactions(f.options));
  await act(async () => { await expect(execute(hook, f)).rejects.toThrow('incomplete result'); });
  expect(f.sign).not.toHaveBeenCalled();
  expect(saved()).toBeUndefined();
  expect(f.state.submitted).toEqual([]);
});

it('expires a stuck nonce read and refuses a late signer invocation', async () => {
  const f = fixture();
  let release!: () => void;
  let entered!: () => void;
  const started = new Promise<void>((resolve) => { entered = resolve; });
  f.state.beforeNonce = () => { entered(); return new Promise<void>((resolve) => { release = resolve; }); };
  const hook = renderHook(() => useShortsWalletTransactions(f.options));
  vi.useFakeTimers();
  try {
    await act(async () => {
      const outcome = execute(hook, f).catch((error: Error) => error);
      // Real crypto and response decoding run between the scheduled SDK dry runs.
      for (let i = 0; i < 100 && !saved(); i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await vi.advanceTimersByTimeAsync(1);
      }
      await started;
      await vi.advanceTimersByTimeAsync(20000);
      expect(await outcome).toMatchObject({ message: 'Wallet transaction preparation timed out. No transaction was sent.' });
      expect(saved()).toBeUndefined();
      release();
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(f.sign).not.toHaveBeenCalled();
    expect(f.state.submitted).toEqual([]);
  } finally { vi.useRealTimers(); hook.unmount(); }
});

it('keeps wallet confirmation open beyond the preparation deadline and submits once', async () => {
  const f = fixture();
  let approve!: () => void;
  const approval = new Promise<void>((resolve) => { approve = resolve; });
  f.sign.mockImplementation(async (tx, options) => {
    await approval;
    f.state.signed = true;
    return AccountMemory.prototype.signTransaction.call(f.account, tx, options);
  });
  const hook = renderHook(() => useShortsWalletTransactions(f.options));
  vi.useFakeTimers();
  try {
    await act(async () => {
      const outcome = execute(hook, f).catch((error: Error) => error);
      for (let i = 0; i < 100 && !f.sign.mock.calls.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await vi.advanceTimersByTimeAsync(1);
      }
      expect(f.sign).toHaveBeenCalledTimes(1);
      const { id } = saved()!;
      await vi.advanceTimersByTimeAsync(60000);
      expect(saved()?.id).toBe(id);
      expect(saved()?.tx).toBeUndefined();
      approve();
      await vi.advanceTimersByTimeAsync(10);
      expect(await outcome).toBeInstanceOf(WalletActionPending);
      expect(saved()?.submission).toBe('attempted');
    });
    expect(f.sign).toHaveBeenCalledTimes(1);
    expect(mocks.request.mock.calls.filter(([path]) => path === '/like-sponsorships')).toHaveLength(1);
  } finally { vi.useRealTimers(); hook.unmount(); }
});

type RpcRequest = {
  jsonrpc: string;
  id?: number;
  method: string;
  params?: any;
};
async function extensionFixture(f: ReturnType<typeof fixture>) {
  const sdk = new AeSdkAepp({
    name: 'Shorts fixture', nodes: [{ name: 'fixture', instance: f.node }],
  });
  const controls = {
    sign: (tx: `tx_${string}`, networkId: string, innerTx?: boolean) => f.account.signTransaction(tx, { networkId, innerTx }),
    reject: false,
  };
  const requests: RpcRequest[] = [];
  const messages = new Set<(message: unknown, port: unknown) => void>();
  const disconnected = new Set<() => void>();
  const port = {
    name: 'owned-fixture',
    onMessage: {
      addListener: (callback: (message: unknown, port: unknown) => void) => messages.add(callback),
      removeListener: (callback: (message: unknown, port: unknown) => void) => {
        messages.delete(callback);
      },
    },
    onDisconnect: {
      addListener: (callback: () => void) => disconnected.add(callback),
      removeListener: (callback: () => void) => disconnected.delete(callback),
    },
    disconnect: () => disconnected.forEach((callback) => callback()),
    postMessage: (request: RpcRequest) => {
      requests.push(request);
      const reply = (value: unknown) => messages.forEach((callback) => callback({
        jsonrpc: '2.0', id: request.id, ...value as object,
      }, port));
      queueMicrotask(async () => {
        let result: unknown;
        if (request.method === 'connection.open') {
          result = {
            id: 'fixture', name: 'Fixture Wallet', networkId: 'ae_uat', type: 'extension',
          };
        } else if (request.method === 'address.subscribe') {
          result = {
            subscription: ['current'],
            address: {
              current: { [f.account.address]: {} }, connected: {},
            },
          };
        } else if (request.method === 'transaction.sign') {
          if (controls.reject) {
            reply({ error: new RpcRejectedByUserError().toJSON() });
            return;
          }
          result = {
            signedTransaction: await controls.sign(request.params.tx, request.params.networkId, request.params.innerTx),
          };
        } else if (request.method === 'connection.close') return;
        else throw new Error(`Unexpected RPC method ${request.method}`);
        reply({ result });
      });
    },
  };
  const connection = new BrowserRuntimeConnection({ port: port as any });
  await sdk.connectToWallet(connection);
  await sdk.subscribeAddress('subscribe' as SUBSCRIPTION_TYPES, 'current');
  return { sdk, controls, requests };
}

it.each([
  ['delete_comment', 'Comments cannot be deleted.'],
  ['withdraw', 'Published Shorts cannot be withdrawn.'],
] as const)('rejects new %s requests before preparing, signing or submitting a transaction', async (method, message) => {
  const f = fixture();
  const hook = renderHook(() => useShortsWalletTransactions(f.options));
  try {
    await act(async () => {
      await expect(hook.result.current.run(f.sdk, method, 'video', '0', f.config, f.contract, vi.fn())).rejects.toThrow(message);
    });
    expect(f.sign).not.toHaveBeenCalled();
    expect(f.state.submitted).toEqual([]);
    expect(f.calls).toEqual([]);
    expect(saved()).toBeUndefined();
  } finally { hook.unmount(); }
});

it.each(['hash', 'raw', 'refreshed nonce'])('signs a sponsored Like through real extension RPC using %s signatures', async (format) => {
  const f = fixture();
  const wallet = await extensionFixture(f);
  if (format === 'raw') {
    wallet.controls.sign = async (tx, networkId, innerTx) => buildTx({
      tag: Tag.SignedTx,
      encodedTx: tx,
      signatures: [await f.account.unsafeSign(new Uint8Array([
        ...new TextEncoder().encode(innerTx ? `${networkId}-inner_tx` : networkId), ...decode(tx),
      ]))],
    });
  }
  if (format === 'refreshed nonce') { wallet.controls.sign = (tx, networkId, innerTx) => f.account.signTransaction(buildTx({ ...unpackTx(tx, Tag.ContractCallTx), nonce: 2 }), { networkId, innerTx }); }
  const hook = renderHook(() => useShortsWalletTransactions(f.options));
  try {
    await act(async () => {
      await expect(hook.result.current.run(wallet.sdk, 'like', 'owned-sdk-fixture', '0', f.config, f.contract, vi.fn(), undefined, 'session')).rejects.toBeInstanceOf(WalletActionPending);
    });
    const signatures = wallet.requests.filter((request) => request.method === 'transaction.sign');
    expect(signatures).toHaveLength(1);
    expect(signatures[0].params).toMatchObject({
      onAccount: f.account.address, returnSigned: true, networkId: 'ae_uat', innerTx: true,
    });
    const post = mocks.request.mock.calls.find(([url]) => url === '/like-sponsorships');
    expect(post).toBeDefined(); expect(post![2]).toBe('session');
    const raw = post![1].signedInnerTx;
    expect(saved()?.tx).toBe(buildTxHash(raw)); expect(saved()?.rawInner).toBe(raw);
    expect(saved()?.submission).toBe('attempted');
    expect(unpackTx(raw, Tag.SignedTx).encodedTx).toMatchObject({
      tag: Tag.ContractCallTx, amount: '0', contractId: f.contract, gasLimit: 100000, ttl: 110,
    });
    expect(saved()?.args).toEqual(['owned-sdk-fixture', '3']);
    expect(saved()?.nonce).toBe(format === 'refreshed nonce' ? 2 : 1);
    expect(f.state.submitted).toHaveLength(0);
  } finally { wallet.sdk.disconnectWallet(); }
});
it('rejects wallets that sign a user-paid transaction instead of the sponsored inner domain', async () => {
  const f = fixture(); const wallet = await extensionFixture(f);
  wallet.controls.sign = (tx, networkId) => f.account.signTransaction(tx, { networkId });
  const hook = renderHook(() => useShortsWalletTransactions(f.options));
  try {
    await act(async () => { await expect(hook.result.current.run(wallet.sdk, 'like', 'owned-sdk-fixture', '0', f.config, f.contract, vi.fn(), undefined, 'session')).rejects.toThrow(/does not match/); });
    expect(mocks.request.mock.calls.filter(([url]) => url === '/like-sponsorships')).toHaveLength(0);
    expect(saved()).toBeUndefined(); expect(f.state.submitted).toHaveLength(0);
  } finally { wallet.sdk.disconnectWallet(); }
});
it('preserves wallet rejection without sponsorship or a pending record', async () => {
  const f = fixture(); const wallet = await extensionFixture(f); wallet.controls.reject = true;
  const hook = renderHook(() => useShortsWalletTransactions(f.options));
  try {
    await act(async () => { await expect(hook.result.current.run(wallet.sdk, 'like', 'owned-sdk-fixture', '0', f.config, f.contract, vi.fn(), undefined, 'session')).rejects.toBeInstanceOf(RpcRejectedByUserError); });
    expect(saved()).toBeUndefined(); expect(f.state.submitted).toHaveLength(0);
  } finally { wallet.sdk.disconnectWallet(); }
});
it('keeps the exact signed Like after a lost sponsor response and retries without a second signature', async () => {
  const f = fixture();
  mocks.request.mockImplementation(async (url) => {
    if (url === '/like-sponsorships') throw new Error('Connection lost');
    return {
      ...saved(), sponsored: true, status: 'unknown', confirmationsRequired: 3, confirmations: 0,
    };
  });
  const hook = renderHook(() => useShortsWalletTransactions(f.options));
  await act(async () => { await expect(execute(hook, f)).rejects.toBeInstanceOf(WalletActionPending); });
  const first = saved(); expect(first?.rawInner).toBeDefined(); expect(first?.submission).toBe('attempted');
  await act(async () => { await expect(execute(hook, f)).rejects.toThrow(/still pending/); });
  await waitFor(() => expect(hook.result.current.action?.tx).toBe(first?.tx));
  await act(async () => { await hook.result.current.retrySponsorship(); });
  const posts = mocks.request.mock.calls.filter(([url]) => url === '/like-sponsorships');
  expect(posts).toHaveLength(2); expect(posts[1][1]).toEqual(posts[0][1]);
  expect(f.sign).toHaveBeenCalledOnce(); expect(f.state.submitted).toHaveLength(0);
});
it('does not send signed bytes if the durable submission checkpoint fails', async () => {
  const f = fixture(); mocks.rejectSubmissionWrite = true;
  const hook = renderHook(() => useShortsWalletTransactions(f.options));
  await act(async () => { await expect(execute(hook, f)).rejects.toThrow(/checkpoint/); });
  expect(saved()).toBeUndefined(); expect(mocks.request.mock.calls.filter(([url]) => url === '/like-sponsorships')).toHaveLength(0);
  expect(f.state.submitted).toHaveLength(0);
});
it.each(['disabled', 'gas', 'fee', 'price', 'ttl', 'policy', 'frozen', 'nonzero value'])('does not open the wallet when %s is invalid', async (change) => {
  const f = fixture();
  if (change === 'disabled') f.config.likeSponsorship!.enabled = false;
  if (change === 'gas') f.config.likeSponsorship!.gasLimit = 200001;
  if (change === 'fee') f.config.likeSponsorship!.maxFee = '10000000000000001';
  if (change === 'price') f.config.likeSponsorship!.gasPrice = '100000000001';
  if (change === 'ttl') f.config.likeSponsorship!.ttlBlocks = 61;
  if (change === 'policy') f.state.cfg[1] = 4n;
  if (change === 'frozen') f.state.lifecycle.frozen = true;
  const hook = renderHook(() => useShortsWalletTransactions(f.options));
  await act(async () => { await expect(change === 'nonzero value' ? hook.result.current.run(f.sdk, 'like', 'owned-sdk-fixture', '1', f.config, f.contract, vi.fn(), undefined, 'session') : execute(hook, f)).rejects.toThrow(); });
  expect(f.sign).not.toHaveBeenCalled(); expect(saved()).toBeUndefined();
});
it.each(['unreachable', 'oversized header', 'oversized stream', 'malformed JSON'])('fails closed on a %s verification response', async (failure) => {
  const f = fixture(); const cancel = vi.fn();
  vi.stubGlobal('fetch', vi.fn(async (_url: URL, options: RequestInit) => {
    expect(options.credentials).toBe('omit'); expect(options.redirect).toBe('error');
    if (failure === 'unreachable') throw new Error('Node unavailable');
    if (failure === 'malformed JSON') return new Response('{broken');
    return new Response(new ReadableStream({ start(controller) { if (failure === 'oversized stream') controller.enqueue(new Uint8Array(1048577)); }, cancel }), { headers: failure === 'oversized header' ? { 'content-length': '1048577' } : {} });
  }));
  const hook = renderHook(() => useShortsWalletTransactions(f.options));
  await act(async () => { await expect(execute(hook, f)).rejects.toThrow(); });
  if (failure.startsWith('oversized')) expect(cancel).toHaveBeenCalledOnce();
  expect(f.sign).not.toHaveBeenCalled(); expect(saved()).toBeUndefined();
});

it('rejects current free-contract claims before journaling or signing', async () => {
  const f = fixture();
  const hook = renderHook(() => useShortsWalletTransactions(f.options));
  try {
    await act(async () => {
      await expect(hook.result.current.run(f.sdk, 'claim', undefined, '0', f.config, f.contract, vi.fn())).rejects.toThrow('Free Likes do not generate rewards to claim.');
    });
    expect(f.sign).not.toHaveBeenCalled();
    expect(f.state.submitted).toEqual([]);
    expect(saved()).toBeUndefined();
  } finally { hook.unmount(); }
});

it('still signs claims against the verified earlier reward contract', async () => {
  const f = fixture(true);
  const hook = renderHook(() => useShortsWalletTransactions(f.options));
  try {
    await act(async () => {
      await expect(hook.result.current.run(f.sdk, 'claim', undefined, '0', f.config, f.config.previousContract!, vi.fn())).rejects.toBeInstanceOf(WalletActionPending);
    });
    expect(f.sign).toHaveBeenCalledOnce();
    expect(saved()?.contract).toBe(f.config.previousContract);
    expect(saved()?.method).toBe('claim');
  } finally { hook.unmount(); }
});

it('signs a bounded zero-payment Like at the public testnet gas price', async () => {
  const f = fixture();
  f.config.likeSponsorship!.gasPrice = '30300000000';
  f.config.likeSponsorship!.maxFee = '10000000000000000';
  const hook = renderHook(() => useShortsWalletTransactions(f.options));
  await act(async () => { await expect(execute(hook, f)).rejects.toBeInstanceOf(WalletActionPending); });
  expect(f.sign).toHaveBeenCalledOnce();
  const call = unpackTx(saved()!.rawInner as `tx_${string}`, Tag.SignedTx).encodedTx;
  expect(call.tag).toBe(Tag.ContractCallTx);
  if (call.tag !== Tag.ContractCallTx) throw new Error('Expected a Like call');
  expect(String(call.gasPrice)).toBe('30300000000');
  expect(String(call.amount)).toBe('0');
  expect(BigInt(call.fee)).toBeLessThanOrEqual(10000000000000000n);
});
