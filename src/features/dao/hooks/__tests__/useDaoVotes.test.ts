import { createElement, type ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import {
  fetchDaoVotes, fetchOpenVoteCloseHeights, useDaoOpenVoteCount, withStatus,
} from '../useDaoVotes';

// A fake chain: the sale's DAO, its vote list and each vote contract's state, keyed by address.
let daoVotes: Map<bigint, [boolean, string]>;
let voteStates: Record<string, { close_height: bigint; vote_state: Map<boolean, bigint> }>;
let reads: string[];
let salesRead: string[];
let tokenRead: boolean;
let height: number | null;

vi.mock('@/hooks/useAeSdk', () => ({
  useAeSdk: () => ({ staticAeSdk: {}, currentBlockHeight: height }),
}));

vi.mock('bctsl-sdk', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  initFallBack: async (_sdk: unknown, sale: string) => {
    salesRead.push(sale);
    return {
      checkAndGetDAO: async () => ({
        state: async () => ({ vote_timeout: 960n, votes: daoVotes }),
        tokenContractInstance: async () => {
          tokenRead = true;
          return { total_supply: async () => ({ decodedResult: 1000n }) };
        },
      }),
    };
  },
  initDAOVote: async (_sdk: unknown, address: string) => ({
    state: async () => {
      reads.push(address);
      return voteStates[address];
    },
  }),
}));

const vote = (close: number, yes = 0n) => ({
  close_height: BigInt(close), vote_state: new Map([[true, yes], [false, 0n]]),
});
const SDK = {} as any;
const SALE = 'ct_sale' as any;

beforeEach(() => {
  daoVotes = new Map([[0n, [true, 'ct_v0']], [1n, [false, 'ct_v1']], [2n, [false, 'ct_v2']]]);
  voteStates = { ct_v0: vote(100, 500n), ct_v1: vote(200), ct_v2: vote(300) };
  reads = [];
  salesRead = [];
  tokenRead = false;
});

describe('fetchDaoVotes', () => {
  it('reads every vote, newest first, with its apply flag and the DAO apply window', async () => {
    const data = await fetchDaoVotes(SDK, SALE);

    expect(data.votes.map((v) => [v.id, v.address, v.applied])).toEqual([
      [2n, 'ct_v2', false], [1n, 'ct_v1', false], [0n, 'ct_v0', true],
    ]);
    expect(data.voteTimeout).toBe(960);
    expect(data.tokenSupply).toBe(1000n);
  });

  it('reads the DAO that owns the sale now, so it follows a passed ChangeDAO vote', async () => {
    await fetchDaoVotes(SDK, SALE);

    expect(salesRead).toEqual([SALE]);
  });

  it('does not read the token for a DAO without votes', async () => {
    daoVotes = new Map();

    expect(await fetchDaoVotes(SDK, SALE)).toEqual({
      voteTimeout: 960, tokenSupply: undefined, votes: [],
    });
    expect(tokenRead).toBe(false);
  });
});

describe('withStatus', () => {
  it('waits for the block height', async () => {
    expect(withStatus(await fetchDaoVotes(SDK, SALE), null)).toEqual([]);
    expect(withStatus(undefined, 150)).toEqual([]);
  });

  it('gives each vote its status at the height', async () => {
    const votes = withStatus(await fetchDaoVotes(SDK, SALE), 250);

    expect(votes.map((v) => [v.address, v.status])).toEqual([
      ['ct_v2', 'open'], ['ct_v1', 'failed'], ['ct_v0', 'applied'],
    ]);
  });
});

describe('open vote count', () => {
  beforeEach(() => {
    daoVotes = new Map([0, 1, 2, 3].map((id): [bigint, [boolean, string]] => [BigInt(id), [false, `ct_v${id}`]]));
    voteStates = {
      ct_v0: vote(100), ct_v1: vote(200), ct_v2: vote(300), ct_v3: vote(400),
    };
  });

  it('reads only the votes that can still be open, newest first', async () => {
    expect(await fetchOpenVoteCloseHeights(SDK, SALE, 250)).toEqual([400, 300]);
    expect(reads).toEqual(['ct_v3', 'ct_v2', 'ct_v1']);
    expect(salesRead).toEqual([SALE]);
  });

  it('reads no vote of a DAO without votes', async () => {
    daoVotes = new Map();

    expect(await fetchOpenVoteCloseHeights(SDK, SALE, 250)).toEqual([]);
    expect(reads).toEqual([]);
  });

  const renderCount = () => {
    const client = new QueryClient();
    return renderHook(() => useDaoOpenVoteCount('ct_sale'), {
      wrapper: ({ children }: { children: ReactNode }) => (
        createElement(QueryClientProvider, { client }, children)
      ),
    });
  };

  it('counts against the live height without reading the votes again', async () => {
    height = 250;
    const { result, rerender } = renderCount();
    await waitFor(() => expect(result.current).toBe(2));

    height = 350;
    rerender();

    expect(result.current).toBe(1);
    expect(reads).toEqual(['ct_v3', 'ct_v2', 'ct_v1']);
  });

  it('waits for the block height before reading anything', () => {
    height = null;
    const { result } = renderCount();

    expect(result.current).toBe(0);
    expect(reads).toEqual([]);
  });
});
