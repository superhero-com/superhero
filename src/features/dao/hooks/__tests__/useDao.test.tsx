import { act, renderHook, waitFor } from '@testing-library/react';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { useDao } from '../useDao';

type FakeSdk = { name: string };

// The SDK the app currently hands out: the read-only one, then the wallet one once it connects.
let currentSdk: FakeSdk;
// Per SDK: how many next builds fail, and an optional gate that holds its build back.
let failures: Record<string, number>;
let gates: Record<string, Promise<void>>;
let calls: string[];
let builds: string[];

vi.mock('@/hooks/useAeSdk', () => ({ useAeSdk: () => ({ sdk: currentSdk }) }));

vi.mock('bctsl-sdk', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  initFallBack: async (sdk: FakeSdk) => {
    await gates[sdk.name];
    if (failures[sdk.name]) {
      failures[sdk.name] -= 1;
      throw new Error('node unreachable');
    }
    return {
      tokenContractInstance: async () => ({
        total_supply: async () => ({ decodedResult: 1000n }),
        meta_info: async () => ({ decodedResult: { symbol: 'WC', decimals: 18n } }),
        balance: async () => ({ decodedResult: 5n }),
      }),
      checkAndGetDAO: async () => {
        builds.push(sdk.name);
        return {
          sdkName: sdk.name,
          state: async () => ({ vote_timeout: 960n, votes: new Map() }),
          balanceAettos: async () => '0',
          addVote: async () => {
            calls.push(`addVote:${sdk.name}`);
            return { voteId: 1n, address: 'ct_new' };
          },
          applyVoteSubject: async () => { calls.push(`apply:${sdk.name}`); },
        };
      },
    };
  },
}));

const SALE = 'ct_sale' as any;
const METADATA = { subject: { VotePayout: ['ak_x'] }, description: 'Why', link: '' } as any;
const READ_ONLY = { name: 'read-only' };
const WALLET = { name: 'wallet' };

const renderDao = () => renderHook(() => useDao({ tokenSaleAddress: SALE }));
const daoSdk = (result: { current: { dao?: unknown } }) => (result.current.dao as any)?.sdkName;

beforeEach(() => {
  currentSdk = READ_ONLY;
  failures = {};
  gates = {};
  calls = [];
  builds = [];
});

describe('useDao', () => {
  it('rebuilds the contracts when the wallet replaces the read-only SDK, so votes are signed', async () => {
    const { result, rerender } = renderDao();
    await waitFor(() => expect(daoSdk(result)).toBe('read-only'));

    currentSdk = WALLET;
    rerender();

    await waitFor(() => expect(daoSdk(result)).toBe('wallet'));
    await act(async () => {
      await result.current.addVote(METADATA);
      await result.current.applyVoteSubject(1n);
    });
    expect(calls).toEqual(['addVote:wallet', 'apply:wallet']);
  });

  it('tries the wallet rebuild again after it failed once', async () => {
    const { result, rerender } = renderDao();
    await waitFor(() => expect(daoSdk(result)).toBe('read-only'));

    failures.wallet = 1;
    currentSdk = WALLET;
    rerender();
    await waitFor(() => expect(failures.wallet).toBe(0));

    await act(() => result.current.init());

    expect(daoSdk(result)).toBe('wallet');
  });

  it('keeps the wallet contracts when the read-only build finishes after them', async () => {
    let release!: () => void;
    gates['read-only'] = new Promise((resolve) => { release = resolve; });
    const { result, rerender } = renderDao();

    currentSdk = WALLET;
    rerender();
    await waitFor(() => expect(daoSdk(result)).toBe('wallet'));

    release();
    await waitFor(() => expect(builds).toEqual(['wallet', 'read-only']));
    await act(async () => {});

    expect(daoSdk(result)).toBe('wallet');
    await act(async () => { await result.current.addVote(METADATA); });
    expect(calls).toEqual(['addVote:wallet']);
  });

  it('keeps the wallet contracts when the wallet drops and reconnects during a read-only build', async () => {
    currentSdk = WALLET;
    const { result, rerender } = renderDao();
    await waitFor(() => expect(daoSdk(result)).toBe('wallet'));

    let release!: () => void;
    gates['read-only'] = new Promise((resolve) => { release = resolve; });
    currentSdk = READ_ONLY;
    rerender();
    currentSdk = WALLET;
    rerender();
    release();
    await waitFor(() => expect(builds).toEqual(['wallet', 'read-only']));
    await act(async () => {});

    await act(async () => { await result.current.addVote(METADATA); });
    expect(calls).toEqual(['addVote:wallet']);
  });

  it('is not loaded while the wallet build still runs, even if the older build failed', async () => {
    let releaseReadOnly!: () => void;
    let releaseWallet!: () => void;
    gates['read-only'] = new Promise((resolve) => { releaseReadOnly = resolve; });
    gates.wallet = new Promise((resolve) => { releaseWallet = resolve; });
    failures['read-only'] = 1;
    const { result, rerender } = renderDao();
    currentSdk = WALLET;
    rerender();

    releaseReadOnly();
    await waitFor(() => expect(failures['read-only']).toBe(0));
    await act(async () => {});
    expect(result.current.loaded).toBe(false);

    releaseWallet();
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(daoSdk(result)).toBe('wallet');
  });

  it('rejects creating a vote while the DAO is not loaded, instead of doing nothing', async () => {
    failures['read-only'] = 1;
    const { result } = renderDao();
    await waitFor(() => expect(result.current.loaded).toBe(true));

    await expect(result.current.addVote(METADATA)).rejects.toThrow('DAO contracts are not loaded');
    expect(calls).toEqual([]);
  });
});
