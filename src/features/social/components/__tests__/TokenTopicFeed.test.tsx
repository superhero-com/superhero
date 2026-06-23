/* eslint-disable object-curly-newline */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import type { TokenHolderDto } from '../../../../api/generated/models/TokenHolderDto';
import TokenTopicFeed from '../TokenTopicFeed';

const backendMocks = vi.hoisted(() => ({
  getTopicByName: vi.fn(),
}));
const postsServiceMocks = vi.hoisted(() => ({
  listAll: vi.fn(),
}));
const tokensServiceMocks = vi.hoisted(() => ({
  listTokenHolders: vi.fn(),
}));

vi.mock('../../../../api/backend', () => ({
  SuperheroApi: {
    getTopicByName: (...args: any[]) => backendMocks.getTopicByName(...args),
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

function renderFeed(holdersOnly = true) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <TokenTopicFeed
        topicName="TOKEN"
        tokenSaleAddress={TOKEN_ADDRESS}
        holdersOnly={holdersOnly}
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
    backendMocks.getTopicByName.mockResolvedValue({
      posts: [makePost(HOLDER), makePost(STRANGER)],
      post_count: 2,
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
});
