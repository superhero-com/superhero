import React from 'react';
import {
  fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import DirectReplies from '../DirectReplies';

const mocks = vi.hoisted(() => ({ getComments: vi.fn() }));
vi.mock('../../../../api/generated', () => ({
  PostsService: { getComments: mocks.getComments },
}));
vi.mock('../ReplyToFeedItem', () => ({
  default: ({ item }: any) => <div>{item.content}</div>,
}));

function pageData(page: number) {
  return {
    items: [{ id: `reply-${page}`, content: `Reply on page ${page}`, total_comments: 0 }],
    meta: { currentPage: page, totalPages: 10 },
  };
}

function renderReplies() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  render(
    <QueryClientProvider client={client}>
      <DirectReplies id="post" onOpenPost={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe('DirectReplies pagination', () => {
  beforeEach(() => {
    // Simulate browsers without automatic intersection loading; the control must
    // still allow readers to load every reply without fetching the whole thread.
    vi.stubGlobal('IntersectionObserver', undefined);
    delete (window as any).IntersectionObserver;
    mocks.getComments.mockImplementation(async ({ page }: { page: number }) => pageData(page));
  });

  it('caps background loading at five pages and lets the reader load another page', async () => {
    renderReplies();
    await screen.findByText('Reply on page 5');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Load more' })).toBeEnabled());

    expect(mocks.getComments).toHaveBeenCalledTimes(5);
    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));
    await screen.findByText('Reply on page 6');
    expect(mocks.getComments).toHaveBeenCalledTimes(6);
  });

  it('keeps already loaded replies visible after a later page fails and retries that page', async () => {
    let failed = false;
    mocks.getComments.mockImplementation(async ({ page }: { page: number }) => {
      if (page === 2 && !failed) {
        failed = true;
        throw new Error('Temporary network failure');
      }
      return pageData(page);
    });
    renderReplies();

    await screen.findByRole('button', { name: 'Retry' });
    expect(screen.getByText('Reply on page 1')).toBeInTheDocument();
    expect(mocks.getComments).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await screen.findByText('Reply on page 5');
    expect(mocks.getComments.mock.calls.map(([args]) => args.page)).toEqual([1, 2, 2, 3, 4, 5]);
  });
});
