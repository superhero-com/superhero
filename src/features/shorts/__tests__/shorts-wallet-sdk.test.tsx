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
        name: 'paid_like',
        arguments: [{ name: 'id', type: 'string' }],
        returns: { tuple: [] },
        payable: true,
        stateful: true,
      }],
  },
}];
const saved = () => [...mocks.rows.values()][0] as WalletAction | undefined;

// Real SDK Contract.$call, transaction building, dry-run, signing and validation.
// Only transport is simulated. Every URL is handled here; nothing reaches a node.
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
function fixture(previous = false) {
  const account = AccountMemory.generate();
  const contract = encode(new Uint8Array(32).fill(9), Encoding.ContractAddress);
  const previousContract = previous ? encode(new Uint8Array(32).fill(8), Encoding.ContractAddress) : null;
  const bytecode = encode(new Uint8Array(32).fill(7), Encoding.ContractBytearray);
  const identity = {
    compiler: '8.0.0', sourceHash: 'a'.repeat(64), bytecodeHash: digest(bytecode), aciHash: digest(JSON.stringify(aci)),
  };
  const release = {
    schemaVersion: 1 as const,
    network: 'ae_uat' as const,
    node: 'https://node.invalid',
    middleware: 'https://node.invalid/mdw',
    contract,
    previousContract,
    operator: account.address,
    treasury: account.address,
    ...identity,
    likeFeeAetto: '100000000000000000',
    treasuryBps: 2000,
    ...(previous ? { previousArtifact: identity } : {}),
  };
  const config = {
    release,
    network: release.network,
    contract,
    operator: release.operator,
    bytecodeHash: release.bytecodeHash,
    likeFee: '0.1',
    aci,
    ...(previous ? { previousContract, previousAci: aci } : {}),
  } as Config;
  vi.stubEnv('VITE_SHORTS_RELEASE_HASH', digest(JSON.stringify(release)));
  const calls: string[] = [];
  const state = {
    network: 'ae_uat',
    bytecode,
    previous: previousContract,
    cfg: [account.address, account.address, BigInt(release.likeFeeAetto), 2000n] as unknown[],
    beforePreflight: undefined as undefined | (() => Promise<void>),
    insufficientBalanceAfterSigning: false,
    losePostResponse: false,
    beforeVerification: undefined as undefined | (() => Promise<void>),
    submitted: [] as string[],
    signed: false,
  };
  const unitType = new TypeResolver().resolveType({ tuple: [] });
  const unit = new ContractByteArrayEncoder().encodeWithType([], unitType);
  const resultFor = (callData: string) => {
    const coder = new AciContractCallEncoder(aci);
    const encoder = new ContractByteArrayEncoder();
    const resolver = new TypeResolver();
    if (callData === coder.encodeCall('Shorts', 'get_config', [])) {
      return encoder.encodeWithType(state.cfg, resolver.resolveType({ tuple: ['address', 'address', 'int', 'int'] }));
    }
    if (callData === coder.encodeCall('Shorts', 'get_previous', [])) {
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
    } else if (url.pathname.endsWith('/code')) {
      await state.beforePreflight?.();
      value = { bytecode: state.bytecode };
    } else if (url.pathname.endsWith('/next-nonce')) value = { next_nonce: 1 };
    else if (url.pathname.startsWith('/v3/accounts/')) {
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
        results: body.txs.map(({ tx }: { tx: `tx_${string}` }) => {
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
    actor: account.address, network: 'ae_uat', contract, previousContract: previousContract || undefined, onConfirmed: vi.fn(),
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
  'paid_like',
  'owned-sdk-fixture',
  '100000000000000000',
  f.config,
  f.contract,
  vi.fn(),
);
beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto);
  vi.stubGlobal('Uint8Array', Object.getPrototypeOf(Buffer.prototype).constructor);
  mocks.rows.clear();
  mocks.rejectSubmissionWrite = false;
  mocks.request.mockImplementation(async () => ({
    ...saved(), status: 'unknown', confirmationsRequired: 3, confirmations: 0,
  }));
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
    sign: (tx: `tx_${string}`, networkId: string) => f.account.signTransaction(tx, { networkId }),
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
            signedTransaction: await controls.sign(request.params.tx, request.params.networkId),
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

it.each(['hash', 'raw', 'refreshed nonce'])('uses the actual SDK extension RPC adapter with %s signatures', async (format) => {
  const f = fixture();
  const wallet = await extensionFixture(f);
  if (format === 'raw') {
    wallet.controls.sign = async (tx, networkId) => buildTx({
      tag: Tag.SignedTx,
      encodedTx: tx,
      signatures: [await f.account.unsafeSign(
        new Uint8Array([...new TextEncoder().encode(networkId), ...decode(tx)]),
      )],
    });
  } else if (format === 'refreshed nonce') {
    wallet.controls.sign = async (tx, networkId) => {
      const refreshed = buildTx({ ...unpackTx(tx, Tag.ContractCallTx), nonce: 2 });
      return f.account.signTransaction(refreshed, { networkId });
    };
  }
  const hook = renderHook(() => useShortsWalletTransactions(f.options));
  try {
    await act(async () => {
      await expect(hook.result.current.run(
        wallet.sdk,
        'paid_like',
        'owned-sdk-fixture',
        '100000000000000000',
        f.config,
        f.contract,
        vi.fn(),
      )).rejects.toBeInstanceOf(WalletActionPending);
    });
    const signatures = wallet.requests.filter((request) => request.method === 'transaction.sign');
    expect(signatures).toHaveLength(1);
    expect(signatures[0].params).toMatchObject({
      onAccount: f.account.address, returnSigned: true, networkId: 'ae_uat',
    });
    expect(f.state.submitted).toHaveLength(1);
    expect(saved()?.tx).toBe(buildTxHash(f.state.submitted[0] as `tx_${string}`));
    expect(saved()?.nonce).toBe(format === 'refreshed nonce' ? 2 : 1);
  } finally { wallet.sdk.disconnectWallet(); }
});

it('preserves actual RPC rejection without submitting or keeping a pending record', async () => {
  const f = fixture();
  const wallet = await extensionFixture(f);
  wallet.controls.reject = true;
  const hook = renderHook(() => useShortsWalletTransactions(f.options));
  try {
    await act(async () => {
      await expect(hook.result.current.run(
        wallet.sdk,
        'paid_like',
        'owned-sdk-fixture',
        '100000000000000000',
        f.config,
        f.contract,
        vi.fn(),
      )).rejects.toBeInstanceOf(RpcRejectedByUserError);
    });
    expect(f.state.submitted).toHaveLength(0);
    expect(saved()).toBeUndefined();
  } finally { wallet.sdk.disconnectWallet(); }
});

it('runs the real SDK pipeline and keeps an accepted transaction recoverable after a lost response', async () => {
  const f = fixture();
  f.state.losePostResponse = true;
  const hook = renderHook(() => useShortsWalletTransactions(f.options));
  await act(async () => {
    await expect(execute(hook, f)).rejects.toBeInstanceOf(WalletActionPending);
  });
  expect(f.sign).toHaveBeenCalledOnce();
  expect(f.state.submitted).toHaveLength(1);
  expect(saved()?.tx).toBe(buildTxHash(f.state.submitted[0] as `tx_${string}`));
  await act(async () => { await expect(execute(hook, f)).rejects.toThrow(/still pending/); });
  expect(f.sign).toHaveBeenCalledOnce();
});

it('releases a signed transaction when real SDK verification fails before submission', async () => {
  const f = fixture();
  f.state.insufficientBalanceAfterSigning = true;
  const hook = renderHook(() => useShortsWalletTransactions(f.options));
  let result: unknown;
  await act(async () => { result = await execute(hook, f).catch((error) => error); });
  expect(f.sign).toHaveBeenCalledOnce();
  expect(f.state.submitted).toHaveLength(0);
  expect(result).not.toBeInstanceOf(WalletActionPending);
  expect(result).toHaveProperty('name', 'InvalidTxError');
  expect(saved()).toBeUndefined();
});

it('does not submit when storage refuses the submission checkpoint', async () => {
  const f = fixture();
  mocks.rejectSubmissionWrite = true;
  const hook = renderHook(() => useShortsWalletTransactions(f.options));
  await act(async () => {
    await expect(execute(hook, f)).rejects.toThrow('Submission checkpoint could not be saved');
  });
  expect(f.sign).toHaveBeenCalledOnce();
  expect(f.state.submitted).toHaveLength(0);
  expect(saved()).toBeUndefined();
});

it('recovers a prepared action after remount and fences the original SDK call when cancelled', async () => {
  const f = fixture();
  let resume!: () => void;
  f.state.beforeVerification = () => new Promise<void>((resolve) => { resume = resolve; });
  const hook = renderHook(() => useShortsWalletTransactions(f.options));
  let result!: Promise<unknown>;
  act(() => { result = execute(hook, f).catch((error) => error); });
  await waitFor(() => expect(resume).toBeTypeOf('function'));
  hook.unmount();
  const restored = renderHook(() => useShortsWalletTransactions(f.options));
  await waitFor(() => expect(restored.result.current.action?.submission).toBe('prepared'));
  await act(async () => { await restored.result.current.release(); });
  await act(async () => { resume(); await result; });
  expect(f.state.submitted).toHaveLength(0);
  expect(f.sign).toHaveBeenCalledOnce();
  expect(saved()).toBeUndefined();
});

it('does not send for a stale wallet scope after verification resumes', async () => {
  const f = fixture();
  let resume!: () => void;
  f.state.beforeVerification = () => new Promise<void>((resolve) => { resume = resolve; });
  const hook = renderHook(({ actor }) => useShortsWalletTransactions({ ...f.options, actor }), {
    initialProps: { actor: f.account.address },
  });
  let result!: Promise<unknown>;
  act(() => { result = execute(hook, f).catch((error) => error); });
  await waitFor(() => expect(resume).toBeTypeOf('function'));
  hook.rerender({ actor: AccountMemory.generate().address });
  await act(async () => { resume(); await result; });
  expect(f.state.submitted).toHaveLength(0);
  expect(saved()).toBeUndefined();
  expect(hook.result.current.action).toBeUndefined();
});

it('fences a cancellation while SDK verification is still running', async () => {
  const f = fixture();
  let resume!: () => void;
  f.state.beforeVerification = () => new Promise<void>((resolve) => { resume = resolve; });
  const hook = renderHook(() => useShortsWalletTransactions(f.options));
  let result!: Promise<unknown>;
  act(() => { result = execute(hook, f).catch((error) => error); });
  await waitFor(() => expect(resume).toBeTypeOf('function'));
  await waitFor(() => expect(hook.result.current.action?.tx).toBeTruthy());
  await act(async () => { await hook.result.current.release(); });
  await act(async () => { resume(); await result; });
  expect(f.state.submitted).toHaveLength(0);
  expect(saved()).toBeUndefined();
});

it.each(['missing pin', 'wrong pin', 'API fee', 'API contract', 'ACI', 'network', 'bytecode', 'treasury', 'fee', 'split', 'previous'])('rejects %s before opening the wallet', async (change) => {
  const f = fixture();
  if (change === 'missing pin') vi.stubEnv('VITE_SHORTS_RELEASE_HASH', '');
  if (change === 'wrong pin') vi.stubEnv('VITE_SHORTS_RELEASE_HASH', '0'.repeat(64));
  if (change === 'API fee') f.config.likeFee = '0.2';
  if (change === 'API contract') f.config.contract = encode(new Uint8Array(32).fill(4), Encoding.ContractAddress);
  if (change === 'ACI') f.config.aci = [{ changed: true }];
  if (change === 'network') f.state.network = 'ae_mainnet';
  if (change === 'bytecode') f.state.bytecode = encode(new Uint8Array(32).fill(5), Encoding.ContractBytearray);
  if (change === 'treasury') f.state.cfg[1] = AccountMemory.generate().address;
  if (change === 'fee') f.state.cfg[2] = 1n;
  if (change === 'split') f.state.cfg[3] = 10000n;
  if (change === 'previous') f.state.previous = encode(new Uint8Array(32).fill(4), Encoding.ContractAddress);
  const hook = renderHook(() => useShortsWalletTransactions(f.options));
  await act(async () => { await expect(execute(hook, f)).rejects.toThrow(); });
  expect(f.sign).not.toHaveBeenCalled();
  expect(f.state.submitted).toHaveLength(0);
  expect(saved()).toBeUndefined();
  if (['missing pin', 'wrong pin', 'API fee', 'API contract', 'ACI'].includes(change)) expect(f.calls).toHaveLength(0);
});

it('rejects a changed connected node before starting independent verification', async () => {
  const f = fixture();
  const other = new Node('https://other.invalid');
  f.sdk.getContext = () => ({ onNode: other, onAccount: f.account });
  const hook = renderHook(() => useShortsWalletTransactions(f.options));
  await act(async () => { await expect(execute(hook, f)).rejects.toThrow(/different node/); });
  expect(f.calls).toHaveLength(0); expect(f.sign).not.toHaveBeenCalled();
});

it('cancels a delayed preflight when the wallet scope changes', async () => {
  const f = fixture();
  let resume!: () => void;
  f.state.beforePreflight = () => new Promise<void>((resolve) => { resume = resolve; });
  const hook = renderHook(({ actor }) => useShortsWalletTransactions({ ...f.options, actor }), { initialProps: { actor: f.account.address } });
  let result!: Promise<unknown>;
  act(() => { result = execute(hook, f).catch((error) => error); });
  await waitFor(() => expect(resume).toBeTypeOf('function'));
  hook.rerender({ actor: AccountMemory.generate().address });
  await act(async () => { resume(); await result; });
  expect(f.sign).not.toHaveBeenCalled(); expect(saved()).toBeUndefined();
});

it('claims previous-contract rewards only with the release-pinned old ABI and bytecode', async () => {
  const f = fixture(true);
  const hook = renderHook(() => useShortsWalletTransactions(f.options));
  await act(async () => {
    await expect(hook.result.current.run(f.sdk, 'claim', undefined, '0', f.config, f.config.previousContract!, vi.fn())).rejects.toBeInstanceOf(WalletActionPending);
  });
  expect(f.sign).toHaveBeenCalledOnce();
  const signed = unpackTx(f.state.submitted[0] as `tx_${string}`, Tag.SignedTx);
  expect(signed.encodedTx).toMatchObject({ contractId: f.config.previousContract, amount: '0' });
  expect(f.calls).toContain(`GET /v3/contracts/${f.config.previousContract}/code`);
});

it('does not open an old-contract payment or a claim with a tampered old ABI', async () => {
  const f = fixture(true);
  const hook = renderHook(() => useShortsWalletTransactions(f.options));
  await act(async () => {
    await expect(hook.result.current.run(f.sdk, 'paid_like', 'video', '100000000000000000', f.config, f.config.previousContract!, vi.fn())).rejects.toThrow(/reviewed Shorts payment/);
    f.config.previousAci = [{ changed: true }];
    await expect(hook.result.current.run(f.sdk, 'claim', undefined, '0', f.config, f.config.previousContract!, vi.fn())).rejects.toThrow(/interface/);
  });
  expect(f.calls).toHaveLength(0); expect(f.sign).not.toHaveBeenCalled();
});

it.each(['unreachable', 'oversized header', 'oversized stream', 'malformed JSON'])('fails closed on a %s verification response', async (failure) => {
  const f = fixture();
  const cancel = vi.fn();
  vi.stubGlobal('fetch', vi.fn(async (_url: URL, options: RequestInit) => {
    expect(options.credentials).toBe('omit'); expect(options.redirect).toBe('error');
    expect(options.signal).toBeInstanceOf(AbortSignal);
    if (failure === 'unreachable') throw new Error('Node unavailable');
    if (failure === 'malformed JSON') return new Response('{broken');
    return new Response(new ReadableStream({
      start(controller) { if (failure === 'oversized stream') controller.enqueue(new Uint8Array(1048577)); },
      cancel,
    }), { headers: failure === 'oversized header' ? { 'content-length': '1048577' } : {} });
  }));
  const hook = renderHook(() => useShortsWalletTransactions(f.options));
  await act(async () => { await expect(execute(hook, f)).rejects.toThrow(); });
  if (failure.startsWith('oversized')) expect(cancel).toHaveBeenCalledOnce();
  expect(f.sign).not.toHaveBeenCalled(); expect(saved()).toBeUndefined();
});
