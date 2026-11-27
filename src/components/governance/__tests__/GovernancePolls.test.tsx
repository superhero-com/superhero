import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import GovernancePolls from '../GovernancePolls';

function makePoll(id: number, status: 'open' | 'closed') {
  return {
    id,
    poll: `ct_${id}`,
    title: `Poll ${id}`,
    status,
    voteCount: 1,
    endDate: new Date(0) as Date | undefined,
  };
}

let mockPolls: ReturnType<typeof makePoll>[] | undefined = [];
let mockError: Error | null = null;
let mockFetchStatus: 'idle' | 'fetching' | 'paused' = 'idle';
const mockRefetch = vi.fn();

vi.mock('@/hooks', () => ({
  useGovernance: () => ({
    usePolls: ({ status, search = '' }: { status: 'all' | 'open' | 'closed'; search?: string }) => {
      const data = mockPolls?.filter((p) => (status === 'all' || p.status === status) && p.title.toLowerCase().includes(search.toLowerCase()));
      // React Query's flags: pending until data or an error arrives, loading only while
      // fetching. Offline the fetch is paused, so a pending query is not loading.
      const isPending = data === undefined && !mockError;
      return {
        data,
        error: mockError,
        isPending,
        isLoading: isPending && mockFetchStatus === 'fetching',
        refetch: mockRefetch,
      };
    },
  }),
}));

function renderPolls() {
  return render(
    <MemoryRouter>
      <GovernancePolls />
    </MemoryRouter>,
  );
}

describe('GovernancePolls', () => {
  beforeEach(() => {
    mockError = null;
    mockFetchStatus = 'idle';
    mockRefetch.mockReset();
  });

  it('filters by status and search, and clears an empty search', () => {
    mockPolls = [makePoll(1, 'open'), makePoll(2, 'closed'), makePoll(3, 'closed')];
    renderPolls();
    expect(screen.getByLabelText('3 results')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Closed' }));
    expect(screen.queryByRole('link', { name: /Poll #1/ })).not.toBeInTheDocument();
    expect(screen.getByLabelText('2 results')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'nothing' } });
    expect(screen.getByText('No polls found')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByLabelText('3 results')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All polls' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps the filter controls on screen while polls load, without a count', () => {
    mockFetchStatus = 'fetching';
    mockPolls = undefined;
    renderPolls();

    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All polls' })).toBeInTheDocument();
  });

  it('keeps loading rather than reporting no polls while offline', () => {
    mockFetchStatus = 'paused';
    mockPolls = undefined;
    renderPolls();

    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('No polls found')).not.toBeInTheDocument();
  });

  it('shows a load failure with a retry instead of an empty list', () => {
    mockPolls = undefined;
    mockError = new Error('Governance request failed: 502');
    renderPolls();

    expect(screen.getByText("Couldn't load polls.")).toBeInTheDocument();
    expect(screen.queryByText('No polls found')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('labels a poll without a close height as having no end date', () => {
    mockPolls = [{ ...makePoll(1, 'open'), endDate: undefined }];
    renderPolls();

    expect(screen.getByText('No end date')).toBeInTheDocument();
  });

  it('gives the list a page heading for screen readers', () => {
    renderPolls();

    expect(screen.getByRole('heading', { level: 1, name: 'Governance polls' })).toBeInTheDocument();
  });
});
