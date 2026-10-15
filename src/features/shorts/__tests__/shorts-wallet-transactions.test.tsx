import {
  act, renderHook, waitFor, fireEvent, render, screen,
} from '@testing-library/react';
import { Buffer } from 'node:buffer';
import {
  beforeEach, expect, it, vi,
} from 'vitest';
import {
  AccountMemory, buildTx, buildTxHash, encode, Encoding, Tag,
} from '@aeternity/aepp-sdk';
import { AciContractCallEncoder } from '@aeternity/aepp-calldata';
import {
  useShortsWalletTransactions,
  WalletActionPending,
} from '../use-shorts-wallet-transactions';
import { type WalletAction, walletScopeKey } from '../shorts-wallet-journal';
import type { Config } from '../types';
import { ShortsWalletRecovery } from '../shorts-wallet-recovery';

const mocks = vi.hoisted(() => ({
  rows: new Map<string, unknown>(),
  sign: vi.fn(),
  sent: vi.fn(),
  call: vi.fn(),
  request: vi.fn(),
  status: 'unknown',
  storageUnavailable: false,
}));
vi.mock('../shorts-wallet-journal', async (original) => {
  const actual = await original<typeof import('../shorts-wallet-journal')>();
  return {
    ...actual,
    WalletJournal: class extends actual.WalletJournal {
      constructor() {
        super({
          change: async (scope, edit) => {
            if (mocks.storageUnavailable) throw new Error('Storage unavailable');
            const key = actual.walletScopeKey(scope);
            const next = edit(structuredClone(mocks.rows.get(key)));
            if (next) mocks.rows.set(key, structuredClone(next));
            else mocks.rows.delete(key);
            return next;
          },
        });
      }
    },
  };
});
// Durability unit tests isolate release verification; the SDK suite exercises it.
vi.mock('../shorts-release', () => ({ verifyShortsWalletTarget: async () => ({ aci: [] }) }));
vi.mock('../api', () => ({ SHORTS_API: 'https://api.example', request: mocks.request }));
vi.mock('@aeternity/aepp-sdk', async (original) => {
  const actual = await original<typeof import('@aeternity/aepp-sdk')>();
  return {
    ...actual,
    Contract: {
      initialize: async (options: unknown) => ({
        $call: (...args: unknown[]) => mocks.call(options, ...args),
      }),
    },
  };
});

const contract = encode(new Uint8Array(32).fill(1), Encoding.ContractAddress);
let account: AccountMemory;
const coder = new AciContractCallEncoder([
  {
    contract: {
      name: 'Shorts',
      kind: 'contract_main',
      typedefs: [],
      functions: [
        {
          name: 'paid_like',
          arguments: [{ name: 'id', type: 'string' }],
          returns: { tuple: [] },
          payable: true,
          stateful: true,
        },
      ],
    },
  },
]);
const saved = () => [...mocks.rows.values()][0] as WalletAction | undefined;
const observation = (action: WalletAction, status: string) => ({
  ...action,
  status,
  confirmationsRequired: 3,
  confirmations: status === 'confirmed' ? 3 : 0,
  ...(status === 'confirmed'
    ? {
      blockHash: encode(new Uint8Array(32).fill(3), Encoding.MicroBlockHash),
      blockHeight: 98,
      result: 'ok',
    }
    : {}),
});
const options = (onConfirmed = vi.fn()) => ({
  actor: account.address,
  network: 'ae_uat',
  contract,
  onConfirmed,
});
const sdk = () => {
  const onNode = { postTransaction: async ({ tx }: { tx: string }) => mocks.sent(tx) };
  return {
    address: account.address,
    getContext: () => ({
      onNode,
      onAccount: {
        address: account.address,
        signTransaction: (unsigned: string, args: unknown) => mocks.sign(unsigned, args),
      },
    }),
  };
};
const execute = (
  hook: ReturnType<typeof renderHook<ReturnType<typeof useShortsWalletTransactions>, unknown>>,
  onSigned = vi.fn(),
) => hook.result.current.run(
    sdk() as any,
    'paid_like',
    'video',
    '100000000000000000',
    {} as Config,
    contract,
    onSigned,
);

beforeEach(() => {
  // jsdom and Node Buffer otherwise use different typed-array realms; SDK
  // cryptography runs in Node here. The real browser path has one realm.
  vi.stubGlobal('Uint8Array', Object.getPrototypeOf(Buffer.prototype).constructor);
  vi.clearAllMocks();
  mocks.rows.clear();
  mocks.storageUnavailable = false;
  mocks.status = 'unknown';
  account = AccountMemory.generate();
  mocks.sign.mockImplementation((unsigned, args) => account.signTransaction(unsigned, args));
  mocks.call.mockImplementation(async (context, method, args, callOptions) => {
    expect(callOptions.waitMined).toBe(false);
    const unsigned = buildTx({
      tag: Tag.ContractCallTx,
      callerId: account.address,
      contractId: contract,
      nonce: 7,
      ttl: 100,
      abiVersion: 3,
      amount: callOptions.amount,
      gasLimit: 100000,
      gasPrice: 1000000000,
      fee: '1000000000000000',
      callData: coder.encodeCall('Shorts', method, args),
    });
    const raw = await context.onAccount.signTransaction(unsigned, { networkId: 'ae_uat' });
    // Persistence precedes the SDK's broadcast boundary.
    expect(saved()?.tx).toBe(buildTxHash(raw));
    await context.onNode.postTransaction({ tx: raw });
    return { hash: buildTxHash(raw) };
  });
  mocks.request.mockImplementation(async () => observation(saved()!, mocks.status));
});

it('saves before SDK broadcast and recovers confirmation after remount without signing again', async () => {
  const confirmed = vi.fn();
  const hook = renderHook(() => useShortsWalletTransactions(options(confirmed)));
  await act(async () => {
    await expect(execute(hook)).rejects.toBeInstanceOf(WalletActionPending);
  });
  expect(mocks.sign).toHaveBeenCalledOnce();
  expect(mocks.sent).toHaveBeenCalledOnce();
  expect(saved()?.tx).toMatch(/^th_/);
  expect(confirmed).not.toHaveBeenCalled();
  hook.unmount();
  mocks.status = 'confirmed';
  const restored = renderHook(() => useShortsWalletTransactions(options(confirmed)));
  await waitFor(() => expect(restored.result.current.observation?.status).toBe('confirmed'));
  expect(confirmed).toHaveBeenCalledOnce();
  expect(mocks.sign).toHaveBeenCalledOnce();
  await act(async () => {
    await restored.result.current.release();
  });
  await waitFor(() => expect(restored.result.current.action).toBeUndefined());
  expect(mocks.rows.size).toBe(0);
});

it('keeps post-signing errors pending even if they say cancelled, and prevents another signature', async () => {
  const original = mocks.call.getMockImplementation()!;
  mocks.call.mockImplementation(async (...args) => {
    await original(...args);
    throw new Error('Request cancelled after network timeout');
  });
  const hook = renderHook(() => useShortsWalletTransactions(options()));
  await act(async () => {
    await expect(execute(hook)).rejects.toBeInstanceOf(WalletActionPending);
  });
  const { tx } = saved()!;
  await act(async () => {
    await expect(execute(hook)).rejects.toThrow(/still pending/);
  });
  expect(saved()!.tx).toBe(tx);
  expect(mocks.sign).toHaveBeenCalledOnce();
  expect(mocks.sent).toHaveBeenCalledOnce();
});

it('cancels an unsigned request and fences its late wallet response before SDK broadcast', async () => {
  let finish: (value: `tx_${string}`) => void;
  let unsigned: `tx_${string}`;
  mocks.sign.mockImplementation((value) => {
    unsigned = value;
    return new Promise((resolve) => {
      finish = resolve;
    });
  });
  const hook = renderHook(() => useShortsWalletTransactions(options()));
  let outcome: Promise<unknown>;
  act(() => {
    outcome = execute(hook).catch((error) => error);
  });
  await waitFor(() => expect(mocks.sign).toHaveBeenCalledOnce());
  await waitFor(() => expect(hook.result.current.action).toBeDefined());
  await act(async () => {
    await hook.result.current.release();
  });
  expect(saved()).toBeUndefined();
  await act(async () => {
    finish!(await account.signTransaction(unsigned!, { networkId: 'ae_uat' }));
    await outcome;
  });
  expect(mocks.sent).not.toHaveBeenCalled();
  expect(saved()).toBeUndefined();
});

it('fences account changes while signing and hides the previous account’s activity', async () => {
  const previous = account;
  let finish: (value: `tx_${string}`) => void;
  let unsigned: `tx_${string}`;
  mocks.sign.mockImplementation((value) => {
    unsigned = value;
    return new Promise((resolve) => {
      finish = resolve;
    });
  });
  const confirmed = vi.fn();
  const hook = renderHook(() => useShortsWalletTransactions(options(confirmed)));
  let outcome: Promise<unknown>;
  act(() => {
    outcome = execute(hook).catch((error) => error);
  });
  await waitFor(() => expect(mocks.sign).toHaveBeenCalledOnce());
  account = AccountMemory.generate();
  hook.rerender();
  expect(hook.result.current.action).toBeUndefined();
  await act(async () => {
    finish!(await previous.signTransaction(unsigned!, { networkId: 'ae_uat' }));
    await outcome;
  });
  expect(mocks.sent).not.toHaveBeenCalled();
  expect(confirmed).not.toHaveBeenCalled();
});

it('rejects forged confirmation data and keeps a reload recoverable without submitting again', async () => {
  const confirmed = vi.fn();
  const hook = renderHook(() => useShortsWalletTransactions(options(confirmed)));
  await act(async () => {
    await expect(execute(hook)).rejects.toBeInstanceOf(WalletActionPending);
  });
  mocks.request.mockImplementation(async () => ({
    ...observation(saved()!, 'confirmed'),
    amount: '1',
  }));
  act(() => hook.result.current.check());
  await waitFor(() => expect(hook.result.current.error).toBeTruthy());
  expect(saved()?.tx).toMatch(/^th_/);
  expect(confirmed).not.toHaveBeenCalled();
  await act(async () => {
    await expect(execute(hook)).rejects.toThrow(/could not be verified/);
  });
  expect(mocks.sign).toHaveBeenCalledOnce();
});

it('preserves the prior unsigned intent on duplicate attempts from another mounted caller', async () => {
  mocks.sign.mockRejectedValue(new Error('User rejected'));
  const hook = renderHook(() => useShortsWalletTransactions(options()));
  await act(async () => {
    await expect(execute(hook)).rejects.toThrow('User rejected');
  });
  expect(saved()).toBeUndefined();
  expect(mocks.sent).not.toHaveBeenCalled();
  const intent: WalletAction = {
    network: 'ae_uat',
    contract,
    api: 'https://api.example',
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    version: 1,
    method: 'paid_like',
    amount: '100000000000000000',
    videoId: 'video',
    address: account.address,
  };
  mocks.rows.set(walletScopeKey(intent), intent);
  await act(async () => {
    await expect(execute(hook)).rejects.toThrow(/already waiting/);
  });
  expect(saved()?.id).toBe(intent.id);
  expect(mocks.sign).toHaveBeenCalledOnce();
});

it('never shows the previous wallet action when storage fails after an account switch', async () => {
  const hook = renderHook(() => useShortsWalletTransactions(options()));
  await act(async () => { await expect(execute(hook)).rejects.toBeInstanceOf(WalletActionPending); });
  await waitFor(() => expect(hook.result.current.action?.tx).toBeTruthy());
  const previous = saved();
  mocks.storageUnavailable = true;
  account = AccountMemory.generate();
  hook.rerender();
  await waitFor(() => expect(hook.result.current.error).toBeTruthy());
  expect(hook.result.current.action).toBeUndefined();
  expect(saved()).toEqual(previous);
  await act(async () => { await expect(execute(hook)).rejects.toThrow('Storage unavailable'); });
  expect(mocks.sign).toHaveBeenCalledOnce();
});

it('rechecks retained confirmations and reports a reorganization without resubmission', async () => {
  const onConfirmed = vi.fn();
  const onUnconfirmed = vi.fn();
  const hook = renderHook(() => useShortsWalletTransactions({ ...options(onConfirmed), onUnconfirmed }));
  await act(async () => { await expect(execute(hook)).rejects.toBeInstanceOf(WalletActionPending); });
  mocks.status = 'confirmed';
  act(() => hook.result.current.check());
  await waitFor(() => expect(onConfirmed).toHaveBeenCalledOnce());
  mocks.status = 'reorged';
  act(() => hook.result.current.check());
  await waitFor(() => expect(onUnconfirmed).toHaveBeenCalledOnce());
  expect(hook.result.current.observation?.status).toBe('reorged');
  expect(saved()?.tx).toBeTruthy();
  expect(mocks.sign).toHaveBeenCalledOnce();
  expect(mocks.sent).toHaveBeenCalledOnce();
});

it('shows pending outcomes without offering another payment or cancellation after signing', () => {
  const action = { method: 'paid_like', tx: 'th_visible_hash' } as WalletAction;
  const check = vi.fn();
  const release = vi.fn();
  render(
    <ShortsWalletRecovery
      recovery={{
        action,
        observation: undefined,
        error: undefined,
        check,
        release,
        run: vi.fn(),
      }}
    />,
  );
  expect(screen.getByRole('status')).toHaveTextContent('checking its outcome');
  expect(screen.queryByRole('button', { name: /cancel|retry|pay|done/i })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Check status' }));
  expect(check).toHaveBeenCalledOnce();
  expect(release).not.toHaveBeenCalled();
});

it('rejects changed unsigned payment details before invoking the external signer', async () => {
  const original = mocks.call.getMockImplementation()!;
  mocks.call.mockImplementation((context, method, args, callOptions) => original(context, method, args, { ...callOptions, amount: '1' }));
  const hook = renderHook(() => useShortsWalletTransactions(options()));
  await act(async () => { await expect(execute(hook)).rejects.toThrow(/wallet request does not match/); });
  expect(mocks.sign).not.toHaveBeenCalled();
  expect(mocks.sent).not.toHaveBeenCalled();
  expect(saved()).toBeUndefined();
});
