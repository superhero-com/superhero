import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import TokenTopicComposer from '../TokenTopicComposer';

const backendMocks = vi.hoisted(() => ({
  listPosts: vi.fn(),
}));

vi.mock('../../../../api/backend', () => ({
  SuperheroApi: {
    listPosts: (...args: any[]) => backendMocks.listPosts(...args),
  },
}));

vi.mock('../PostForm', () => ({
  default: ({ placeholder, requiredHashtag }: any) => (
    <div data-testid="post-form" data-hashtag={requiredHashtag}>{placeholder ?? ''}</div>
  ),
}));

function renderComposer() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <TokenTopicComposer tokenName="TOKEN" />
    </QueryClientProvider>,
  );
}

describe('TokenTopicComposer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invites the first post while the topic has none', async () => {
    backendMocks.listPosts.mockResolvedValue({
      items: [],
      meta: { currentPage: 1, totalPages: 0, totalItems: 0 },
    });
    renderComposer();

    await waitFor(() => expect(backendMocks.listPosts).toHaveBeenCalledWith(
      expect.objectContaining({ topic: 'token', page: 1 }),
    ));
    expect(screen.getByTestId('post-form').textContent).toContain('#TOKEN');
    expect(screen.getByTestId('post-form').getAttribute('data-hashtag')).toBe('#token');
  });

  it('drops the invitation once the topic has a post', async () => {
    backendMocks.listPosts.mockResolvedValue({
      items: [{ id: 'p1', content: 'gm #TOKEN', created_at: '2024-01-01T00:00:00.000Z' }],
      meta: { currentPage: 1, totalPages: 1, totalItems: 1 },
    });
    renderComposer();

    await waitFor(() => expect(screen.getByTestId('post-form').textContent).toBe(''));
  });
});
