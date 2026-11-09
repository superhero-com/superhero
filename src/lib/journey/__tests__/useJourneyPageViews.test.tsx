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
      <button type="button" onClick={() => navigate(-1)}>back</button>
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

  const walletConnectedCalls = () => vi.mocked(track).mock.calls
    .filter(([name]) => name === 'wallet_connected');

  it('counts the return from a deep-link connect once, without the address', () => {
    render(
      <MemoryRouter initialEntries={[`/?address=${AK}&networkId=ae_mainnet`]}>
        <App />
      </MemoryRouter>,
    );
    expect(walletConnectedCalls()).toEqual([['wallet_connected']]);
    expect(JSON.stringify(vi.mocked(track).mock.calls)).not.toContain(AK);

    fireEvent.click(screen.getByRole('button', { name: 'token page' }));
    expect(walletConnectedCalls()).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'back' }));
    expect(walletConnectedCalls()).toHaveLength(1);
  });

  it.each([
    ['an address alone', `/?address=${AK}`],
    ['something that is not an account', '/?address=nope&networkId=ae_mainnet'],
  ])('does not count %s as a connection', (_name, url) => {
    render(
      <MemoryRouter initialEntries={[url]}>
        <App />
      </MemoryRouter>,
    );
    expect(walletConnectedCalls()).toEqual([]);
  });
});
