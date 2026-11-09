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
    usePolls: ({ status }: { status: 'all' | 'open' | 'closed' }) => {
      const data = status === 'all' ? mockPolls : mockPolls?.filter((p) => p.status === status);
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

// A native select stands in for the Radix one, which jsdom cannot open.
vi.mock('@/components/inputs/AppSelect', () => ({
  default: ({ value, onValueChange, children }: {
    value: string; onValueChange: (v: string) => void; children: React.ReactNode;
  }) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)}>{children}</select>
  ),
  Item: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
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

  it('counts open and closed polls separately instead of one total', () => {
    mockPolls = [makePoll(1, 'open'), makePoll(2, 'closed'), makePoll(3, 'closed')];
    renderPolls();

    // Default filter is "open": only the open count is shown.
    expect(screen.getByText(/^1\s+Active$/)).toBeInTheDocument();
    expect(screen.queryByText(/Closed$/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'all' } });

    expect(screen.getByText(/^1\s+Active$/)).toBeInTheDocument();
    expect(screen.getByText(/^2\s+Closed$/)).toBeInTheDocument();
    expect(screen.queryByText(/Closing$/)).not.toBeInTheDocument();
  });

  it('keeps the filter controls on screen while polls load, without a count', () => {
    mockFetchStatus = 'fetching';
    mockPolls = undefined;
    renderPolls();

    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.queryByText(/Active$/)).not.toBeInTheDocument();
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
    expect(screen.queryByText(/Active$/)).not.toBeInTheDocument();

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

    expect(screen.getByRole('heading', { level: 1, name: 'æternity polls' })).toBeInTheDocument();
  });
});
