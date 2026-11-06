import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { routes } from '../../../routes';
import { setJourneyPage, track } from '../client';
import { useJourneyPageViews } from '../useJourneyPageViews';

// The real tracker is off under tests, so observe what reaches it.
vi.mock('../client', () => ({ setJourneyPage: vi.fn(), track: vi.fn() }));

const AK = 'ak_2swhLkgBPeeADxVTAVCJnZLY5NZtCFiM93JxsEaMuC59euuFRQ';

const App = () => {
  useJourneyPageViews(routes);
  const navigate = useNavigate();
  return (
    <>
      <button type="button" onClick={() => navigate(`/users/${AK}?tab=posts`)}>same page</button>
      <button type="button" onClick={() => navigate('/trends/tokens/WORD')}>token page</button>
    </>
  );
};

beforeEach(() => {
  vi.mocked(track).mockClear();
  vi.mocked(setJourneyPage).mockClear();
});

describe('useJourneyPageViews', () => {
  it('reports each page by its route pattern, once per path', () => {
    render(
      <MemoryRouter initialEntries={[`/users/${AK}`]}>
        <App />
      </MemoryRouter>,
    );
    expect(setJourneyPage).toHaveBeenLastCalledWith('/users/:address');
    expect(vi.mocked(track).mock.calls).toEqual([
      ['page_view', { page: '/users/:address' }],
      ['profile_view', { page: '/users/:address' }],
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'same page' }));
    expect(track).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole('button', { name: 'token page' }));
    expect(vi.mocked(setJourneyPage).mock.calls).toEqual([
      ['/users/:address'],
      ['/trends/tokens/:tokenName'],
    ]);
    expect(vi.mocked(track).mock.calls.slice(2)).toEqual([
      ['page_view', { page: '/trends/tokens/:tokenName' }],
      ['token_view', { page: '/trends/tokens/:tokenName' }],
    ]);
  });
});
