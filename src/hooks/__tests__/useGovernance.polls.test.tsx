import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  describe, expect, it, vi,
} from 'vitest';

import { GovernanceApi } from '@/api/governance';
import { useGovernance } from '../useGovernance';

const HEIGHT = 1000;

function pollRow(id: number, poll: string, closeHeight: number | null) {
  return {
    id, poll, closeHeight, totalStake: '0', voteCount: 1, delegationCount: 0, score: 0,
  };
}

const OPEN = [pollRow(1, 'ct_open', 2000), pollRow(5, 'ct_open_ended', null)];
// The same contract registered twice, as on mainnet.
const CLOSED = [pollRow(2, 'ct_dup', 500), pollRow(3, 'ct_dup', 500), pollRow(4, 'ct_other', 400)];

vi.mock('../useAeSdk', () => ({
  useAeSdk: () => ({
    activeAccount: 'ak_test',
    sdk: { getContext: () => ({}), getHeight: async () => HEIGHT },
  }),
}));

vi.mock('@aeternity/aepp-sdk', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  Contract: {
    initialize: async () => ({
      polls: async () => ({
        decodedResult: new Map([1, 2, 3, 4, 5].map((id) => [BigInt(id), { title: `Poll ${id}` }])),
      }),
    }),
  },
}));

vi.mock('@/api/governance', () => ({
  GovernanceApi: {
    getPollOrdering: vi.fn(async (closed: boolean) => ({
      ordering: [], data: closed ? CLOSED : OPEN,
    })),
  },
}));

function renderPolls(status: 'all' | 'open' | 'closed', search = '') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderHook((props: { search: string }) => useGovernance().usePolls({ status, ...props }), {
    initialProps: { search },
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
}

describe('useGovernance().usePolls', () => {
  it('merges open and closed polls for "all", listing each poll contract once', async () => {
    const { result } = renderPolls('all');
    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data!.map((p) => [p.poll, p.status])).toEqual([
      ['ct_open', 'open'],
      ['ct_open_ended', 'open'],
      ['ct_dup', 'closed'],
      ['ct_other', 'closed'],
    ]);
  });

  it('filters by title on the client, without refetching per keystroke', async () => {
    const { result, rerender } = renderPolls('closed', '  POLL 4 ');
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data!.map((p) => p.title)).toEqual(['Poll 4']);

    rerender({ search: '' });

    expect(result.current.data!.map((p) => p.title)).toEqual(['Poll 2', 'Poll 4']);
    expect(GovernanceApi.getPollOrdering).toHaveBeenCalledTimes(1);
  });

  it('gives a poll without a close height no end date', async () => {
    const { result } = renderPolls('open');
    await waitFor(() => expect(result.current.data).toBeDefined());

    const [bounded, openEnded] = result.current.data!;
    expect(bounded.endDate).toBeInstanceOf(Date);
    expect(openEnded.endDate).toBeUndefined();
  });
});
