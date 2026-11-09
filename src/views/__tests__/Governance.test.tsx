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

const tab = (name: RegExp) => screen.queryByRole('button', { name });

describe('Governance page', () => {
  it.each([
    ['/voting', 'polls view'],
    ['/voting/account', 'account view'],
    ['/voting/create', 'create view'],
    ['/voting/p/ct_poll', 'vote view ct_poll'],
  ])('opens %s on its own tab', (pathname, content) => {
    renderAt(pathname);

    expect(screen.getByText(content)).toBeInTheDocument();
  });

  it('offers the Vote tab only on a poll page', () => {
    const { unmount } = renderAt('/voting');
    expect(tab(/Vote$/)).not.toBeInTheDocument();
    unmount();

    renderAt('/voting/p/ct_poll');
    expect(tab(/Vote$/)).toBeInTheDocument();
  });

  it('switches tabs without leaving the page', () => {
    renderAt('/voting');

    fireEvent.click(tab(/My Account/)!);
    expect(screen.getByText('account view')).toBeInTheDocument();

    fireEvent.click(tab(/Create Poll/)!);
    expect(screen.getByText('create view')).toBeInTheDocument();

    fireEvent.click(tab(/Polls/)!);
    expect(screen.getByText('polls view')).toBeInTheDocument();
  });

  it('returns from a poll to the list through the poll page itself', () => {
    renderAt('/voting/p/ct_poll');

    fireEvent.click(screen.getByText('vote view ct_poll'));

    expect(screen.getByText('polls view')).toBeInTheDocument();
  });

  it('sits under the DAO section with the polls tab current', () => {
    renderAt('/voting/p/ct_poll');

    expect(screen.getByRole('link', { name: 'æternity polls' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Token DAOs' })).toHaveAttribute('href', '/trends/daos');
  });

  it('goes back to the poll list from the section tab while another tab is open', () => {
    renderAt('/voting');
    fireEvent.click(tab(/My Account/)!);

    fireEvent.click(screen.getByRole('link', { name: 'æternity polls' }));

    expect(screen.getByText('polls view')).toBeInTheDocument();
  });
});
