import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {
  describe, expect, it, vi,
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
    endDate: new Date(0),
  };
}

let mockPolls: ReturnType<typeof makePoll>[] | undefined = [];
let mockLoading = false;

vi.mock('@/hooks', () => ({
  useGovernance: () => ({
    usePolls: () => ({ data: mockPolls, isLoading: mockLoading }),
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
  it('counts open and closed polls separately instead of one total', () => {
    mockLoading = false;
    mockPolls = [makePoll(1, 'open'), makePoll(2, 'closed'), makePoll(3, 'closed')];
    renderPolls();

    // Default filter is "open": only the open count is shown.
    expect(screen.getByText(/^1\s+Active$/)).toBeInTheDocument();
    expect(screen.queryByText(/Closed$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Closing$/)).not.toBeInTheDocument();
  });

  it('keeps the filter controls on screen while polls load', () => {
    mockLoading = true;
    mockPolls = undefined;
    renderPolls();

    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });
});
