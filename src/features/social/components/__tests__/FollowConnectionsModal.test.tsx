/* eslint-disable object-curly-newline */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import FollowConnectionsModal from '../FollowConnectionsModal';
import type { SocialGraphConnectionsPage } from '../../../../api/socialGraphConnections';

const service = vi.hoisted(() => ({
  listSocialGraphFollowers: vi.fn(),
  listSocialGraphFollowing: vi.fn(),
}));

vi.mock('../../../../api/socialGraphConnections', () => ({
  SocialGraphConnectionsService: {
    listSocialGraphFollowers: (...a: any[]) => service.listSocialGraphFollowers(...a),
    listSocialGraphFollowing: (...a: any[]) => service.listSocialGraphFollowing(...a),
  },
}));

const OWNER = 'ak_owner00000000000000000000000000000000000000000000';
const A1 = 'ak_alice0000000000000000000000000000000000000000000000';
const A2 = 'ak_bob00000000000000000000000000000000000000000000000';
const A3 = 'ak_carol000000000000000000000000000000000000000000000';

function row(address: string, name: string) {
  return {
    address,
    public_name: name,
    profile: {
      fullname: name,
      bio: null,
      site: null,
      avatarurl: null,
      username: null,
      prefered_aens_name: name,
      x_username: null,
      chain_name: name,
      chain_expires_at: null,
    },
  };
}

function page(items: any[], nextCursor: string | null): SocialGraphConnectionsPage {
  return { items, next_cursor: nextCursor };
}

// Fire the load-more sentinel deterministically: jsdom has no IntersectionObserver,
// so stub one that reports an intersection the moment a node is observed.
function stubIntersectionObserver() {
  /* eslint-disable class-methods-use-this */
  class IO {
    private cb: IntersectionObserverCallback;

    constructor(cb: IntersectionObserverCallback) { this.cb = cb; }

    observe() {
      this.cb(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
    }

    unobserve() {}

    disconnect() {}

    takeRecords() { return []; }
  }
  /* eslint-enable class-methods-use-this */
  vi.stubGlobal('IntersectionObserver', IO as any);
}

function renderModal(props: Partial<React.ComponentProps<typeof FollowConnectionsModal>> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <FollowConnectionsModal address={OWNER} {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('FollowConnectionsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubIntersectionObserver();
  });

  it('lists followers and pages in the next set on scroll', async () => {
    service.listSocialGraphFollowers
      .mockResolvedValueOnce(page([row(A1, 'Alice'), row(A2, 'Bob')], '2'))
      .mockResolvedValueOnce(page([row(A3, 'Carol')], null));

    renderModal();

    expect(await screen.findByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();

    // The stubbed observer fires immediately, so the second page loads without input.
    await waitFor(() => expect(screen.getByText('Carol')).toBeInTheDocument());

    expect(service.listSocialGraphFollowers).toHaveBeenCalledTimes(2);
    expect(service.listSocialGraphFollowers.mock.calls[0][0]).toMatchObject({ cursor: undefined });
    expect(service.listSocialGraphFollowers.mock.calls[1][0]).toMatchObject({ cursor: '2' });
  });

  it('switches to the following tab and queries the other endpoint', async () => {
    service.listSocialGraphFollowers.mockResolvedValue(page([row(A1, 'Alice')], null));
    service.listSocialGraphFollowing.mockResolvedValue(page([row(A2, 'Bob')], null));

    renderModal();
    expect(await screen.findByText('Alice')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('connections-tab-following'));

    expect(await screen.findByText('Bob')).toBeInTheDocument();
    expect(service.listSocialGraphFollowing).toHaveBeenCalledWith(
      expect.objectContaining({ address: OWNER }),
    );
  });

  it('passes the debounced search term to the API', async () => {
    service.listSocialGraphFollowers.mockResolvedValue(page([row(A1, 'Alice')], null));

    renderModal();
    await screen.findByText('Alice');

    fireEvent.change(screen.getByTestId('connections-search'), { target: { value: 'carol' } });

    await waitFor(() => expect(service.listSocialGraphFollowers).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'carol' }),
    ));
  });

  it('shows an empty state when there are no connections', async () => {
    service.listSocialGraphFollowing.mockResolvedValue(page([], null));

    renderModal({ initialTab: 'following' });

    expect(await screen.findByText('Not following anyone yet')).toBeInTheDocument();
  });

  it('surfaces an error with a retry that refetches', async () => {
    service.listSocialGraphFollowers
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(page([row(A1, 'Alice')], null));

    renderModal();

    expect(await screen.findByText('boom')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Try again'));
    expect(await screen.findByText('Alice')).toBeInTheDocument();
  });
});
