import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {
  describe, expect, it, vi,
} from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import Governance from '../Governance';

vi.mock('@/components/governance/GovernancePolls', () => ({ default: () => <div>polls view</div> }));
vi.mock('@/components/governance/GovernanceAccount', () => ({ default: () => <div>account view</div> }));
vi.mock('@/components/governance/GovernanceCreate', () => ({ default: () => <div>create view</div> }));
vi.mock('@/components/governance/GovernanceVote', () => ({
  default: ({ pollId, setActiveTab }: { pollId: string; setActiveTab: (tab: string) => void }) => (
    <button type="button" onClick={() => setActiveTab('polls')}>{`vote view ${pollId}`}</button>
  ),
}));

function renderAt(pathname: string) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <Routes>
        {['/voting', '/voting/p/:id', '/voting/account', '/voting/create'].map((path) => (
          <Route key={path} path={path} element={<Governance />} />
        ))}
      </Routes>
    </MemoryRouter>,
  );
}

const pageLink = (name: RegExp) => screen.queryByRole('link', { name });

describe('Governance page', () => {
  it.each([
    ['/voting', 'polls view'],
    ['/voting/account', 'account view'],
    ['/voting/create', 'create view'],
    ['/voting/p/ct_poll', 'vote view ct_poll'],
  ])('opens the bookmarkable route %s', (pathname, content) => {
    renderAt(pathname);

    expect(screen.getByText(content)).toBeInTheDocument();
  });

  it('navigates between bookmarkable governance pages', () => {
    renderAt('/voting');

    fireEvent.click(pageLink(/Voting power/)!);
    expect(screen.getByText('account view')).toBeInTheDocument();

    fireEvent.click(pageLink(/Create poll/)!);
    expect(screen.getByText('create view')).toBeInTheDocument();
  });

  it('returns from a poll to the list through the poll page itself', () => {
    renderAt('/voting/p/ct_poll');

    fireEvent.click(screen.getByText('vote view ct_poll'));

    expect(screen.getByText('polls view')).toBeInTheDocument();
  });
});
