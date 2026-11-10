/* eslint-disable object-curly-newline */
import React from 'react';
import {
  act, render, screen, waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import type { TokenHolderDto } from '../../../../api/generated/models/TokenHolderDto';
import TokenTopicFeed from '../TokenTopicFeed';
import { insertPostIntoFeeds } from '../../utils/pendingPosts';

const backendMocks = vi.hoisted(() => ({
  listPosts: vi.fn(),
}));
const postsServiceMocks = vi.hoisted(() => ({
  listAll: vi.fn(),
}));
const tokensServiceMocks = vi.hoisted(() => ({
  listTokenHolders: vi.fn(),
}));

vi.mock('../../../../api/backend', () => ({
  SuperheroApi: {
    listPosts: (...args: any[]) => backendMocks.listPosts(...args),
  },
}));

vi.mock('../../../../api/generated', () => ({
  PostsService: {
    listAll: (...args: any[]) => postsServiceMocks.listAll(...args),
  },
}));

vi.mock('../../../../api/generated/services/TokensService', () => ({
  TokensService: {
    listTokenHolders: (...args: any[]) => tokensServiceMocks.listTokenHolders(...args),
  },
}));

// Stub heavy children so we only assert which posts the feed decides to render.
vi.mock('../ReplyToFeedItem', () => ({
  default: ({ item }: any) => (
    <div data-testid="feed-post" data-sender={item.sender_address}>
      {item.sender_address}
    </div>
  ),
}));
vi.mock('../PostSkeleton', () => ({ default: () => <div data-testid="skeleton" /> }));
vi.mock('../../../../components/AeButton', () => ({
  // Drop AeButton-specific props that aren't valid DOM attributes.
  default: ({ children, onClick }: any) => (
    <button type="button" onClick={onClick}>{children}</button>
  ),
}));

const TOKEN_ADDRESS = 'ct_token_sale';
const HOLDER = 'ak_holder';
const STRANGER = 'ak_stranger';

function makeHolder(address: string, balance: string): TokenHolderDto {
  return {
    id: address.length,
    address,
    balance,
    balance_data: {} as any,
    created_at: '2024-01-01T00:00:00.000Z',
  };
}

function makePost(sender: string) {
  return {
    id: `post-${sender}`,
    sender_address: sender,
    content: `gm #TOKEN from ${sender}`,
    created_at: '2024-01-01T00:00:00.000Z',
    total_comments: 0,
  };
}

/** A page of `count` filler holders that are NOT post authors. */
function fillerPage(page: number, count: number): TokenHolderDto[] {
  return Array.from({ length: count }, (_, i) => makeHolder(`ak_filler_${page}_${i}`, '1'));
}

function renderFeed(holdersOnly = true, onAutoDisableHoldersOnly?: () => void) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <TokenTopicFeed
        topicName="TOKEN"
        tokenSaleAddress={TOKEN_ADDRESS}
        holdersOnly={holdersOnly}
        onAutoDisableHoldersOnly={onAutoDisableHoldersOnly}
      />
    </QueryClientProvider>,
  );
}

function renderedSenders(): string[] {
  return screen
    .queryAllByTestId('feed-post')
    .map((node) => node.getAttribute('data-sender') || '');
}

describe('TokenTopicFeed — holders-only filtering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // One holder post and one non-holder post, both tagged with the topic.
    backendMocks.listPosts.mockResolvedValue({
      items: [makePost(HOLDER), makePost(STRANGER)],
      meta: { currentPage: 1, totalPages: 1, totalItems: 2 },
    });
    postsServiceMocks.listAll.mockResolvedValue({ items: [] });
  });

  it('filters to holder posts for popular tokens whose holder set fills the MAX_PAGES cap', async () => {
    // Five full pages of 100 holders: pagination hits the cap without ever
    // returning a short page. The holder authors the first page; the stranger
    // appears in no page. This is the >500-holder case from the bug report.
    tokensServiceMocks.listTokenHolders.mockImplementation(({ page }: { page: number }) => {
      if (page === 1) return Promise.resolve({ items: [makeHolder(HOLDER, '1000'), ...fillerPage(1, 99)] });
      if (page <= 5) return Promise.resolve({ items: fillerPage(page, 100) });
      return Promise.resolve({ items: [] });
    });

    renderFeed(true);

    // Once the (capped) holder set loads, the non-holder post must be hidden.
    // Before the fix `complete` stayed false at the cap, so the feed showed
    // every post as if "Holders only" were off.
    await waitFor(() => {
      expect(renderedSenders()).toEqual([HOLDER]);
    });
    expect(screen.queryByText(STRANGER)).toBeNull();
    // All five pages were requested (cap reached, never short-circuited).
    expect(tokensServiceMocks.listTokenHolders).toHaveBeenCalledTimes(5);
  });

  it('filters to holder posts when the holder set ends naturally (a short page)', async () => {
    tokensServiceMocks.listTokenHolders.mockResolvedValueOnce({
      items: [makeHolder(HOLDER, '1000')], // 1 item < 100 → natural end
    });

    renderFeed(true);

    await waitFor(() => {
      expect(renderedSenders()).toEqual([HOLDER]);
    });
    expect(tokensServiceMocks.listTokenHolders).toHaveBeenCalledTimes(1);
  });

  it('falls back to all posts when holder pagination fails mid-way (set not authoritative)', async () => {
    // Page 1 succeeds (holder present) but page 2 rejects: the partial set is
    // truncated at an arbitrary point, so we must NOT hide non-holder posts.
    tokensServiceMocks.listTokenHolders.mockImplementation(({ page }: { page: number }) => {
      if (page === 1) return Promise.resolve({ items: [makeHolder(HOLDER, '1000'), ...fillerPage(1, 99)] });
      return Promise.reject(new Error('network'));
    });

    renderFeed(true);

    await waitFor(() => {
      expect(renderedSenders()).toHaveLength(2);
    });
    expect(renderedSenders().sort()).toEqual([HOLDER, STRANGER].sort());
  });

  it('shows all posts when holders-only is off', async () => {
    tokensServiceMocks.listTokenHolders.mockResolvedValue({
      items: [makeHolder(HOLDER, '1000')],
    });

    renderFeed(false);

    await waitFor(() => {
      expect(renderedSenders()).toHaveLength(2);
    });
    expect(renderedSenders().sort()).toEqual([HOLDER, STRANGER].sort());
  });

  it('keeps holders only when the holder post is on a later topic page', async () => {
    tokensServiceMocks.listTokenHolders.mockResolvedValue({
      items: [makeHolder(HOLDER, '1000')],
    });
    backendMocks.listPosts.mockImplementation(({ page }: { page: number }) => Promise.resolve({
      items: page === 1
        ? Array.from({ length: 100 }, (_, i) => makePost(`${STRANGER}_${i}`))
        : [makePost(HOLDER)],
      meta: { currentPage: page, totalPages: 2, totalItems: 101 },
    }));
    const onAutoDisableHoldersOnly = vi.fn();

    renderFeed(true, onAutoDisableHoldersOnly);

    await waitFor(() => {
      expect(renderedSenders()).toEqual([HOLDER]);
    });
    expect(onAutoDisableHoldersOnly).not.toHaveBeenCalled();
  });
});

describe('TokenTopicFeed — paged topic posts', () => {
  // Query notifies React on a timer, so asserting that nothing more happens waits for it.
  const settle = () => new Promise((resolve) => { setTimeout(resolve, 20); });

  /** Mocks `totalPages` pages of 100 posts each, matching the hashtag or not. */
  function topicPages(totalPages: number, content = 'gm #TOKEN') {
    backendMocks.listPosts.mockImplementation(({ page }: { page: number }) => Promise.resolve({
      items: Array.from({ length: 100 }, (_, i) => ({
        id: `p${page}-${i}`,
        sender_address: `ak_${page}_${i}`,
        content,
        created_at: new Date(Date.UTC(2024, 0, 1) - (page * 100 + i) * 1000).toISOString(),
        total_comments: 0,
      })),
      meta: { currentPage: page, totalPages, totalItems: totalPages * 100 },
    }));
  }
  const requestedPages = () => backendMocks.listPosts.mock.calls.map(([params]) => params.page);

  beforeEach(() => {
    vi.clearAllMocks();
    postsServiceMocks.listAll.mockResolvedValue({ items: [] });
    tokensServiceMocks.listTokenHolders.mockResolvedValue({ items: [] });
  });

  it('asks for the exact topic, newest first', async () => {
    topicPages(1);
    renderFeed(false);

    await waitFor(() => expect(renderedSenders()).toHaveLength(10));
    expect(backendMocks.listPosts).toHaveBeenCalledWith({
      topic: 'token', page: 1, limit: 100, orderBy: 'created_at', orderDirection: 'DESC',
    });
  });

  it('loads pages until it holds the 200 newest matches', async () => {
    topicPages(4);
    renderFeed(false);

    await waitFor(() => expect(requestedPages()).toEqual([1, 2]));
    await settle();
    expect(requestedPages()).toEqual([1, 2]);
  });

  it('keeps paging past posts the hashtag filter drops, at most 5 pages', async () => {
    // #TOKEN-DEV is another topic, so the feed's hashtag regex rejects it.
    topicPages(10, 'gm #TOKEN-DEV');
    renderFeed(false);

    await waitFor(() => expect(requestedPages()).toEqual([1, 2, 3, 4, 5]));
    await settle();
    expect(requestedPages()).toEqual([1, 2, 3, 4, 5]);
  });

  it('keeps the loaded posts and stops paging when a later page fails', async () => {
    topicPages(3);
    const firstPage = backendMocks.listPosts.getMockImplementation()!;
    backendMocks.listPosts.mockImplementation((params: { page: number }) => (
      params.page === 1 ? firstPage(params) : Promise.reject(new Error('network'))
    ));
    renderFeed(false);

    await waitFor(() => expect(requestedPages()).toEqual([1, 2]));
    await settle();
    expect(requestedPages()).toEqual([1, 2]);
    expect(renderedSenders()).toHaveLength(10);
  });

  it('shows the viewer\'s new post on top before the API has it', async () => {
    topicPages(1);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
    render(
      <QueryClientProvider client={client}>
        <TokenTopicFeed topicName="#token" tokenSaleAddress={TOKEN_ADDRESS} holdersOnly={false} />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(renderedSenders()).toHaveLength(10));

    act(() => {
      insertPostIntoFeeds(client, {
        id: 'mine_v3', sender_address: 'ak_me', content: '#TOKEN gm', created_at: new Date().toISOString(),
      }, '#token');
    });

    await waitFor(() => expect(renderedSenders()[0]).toBe('ak_me'));
  });
});
