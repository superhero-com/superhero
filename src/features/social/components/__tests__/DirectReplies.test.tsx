import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  describe, expect, it, vi,
} from 'vitest';
import { PostsService } from '@/api/generated';
import DirectReplies from '../DirectReplies';

vi.mock('../ReplyToFeedItem', () => ({ default: () => null }));

describe('DirectReplies', () => {
  it('auto-loads at most five pages after the first one', async () => {
    const getComments = vi.spyOn(PostsService, 'getComments').mockImplementation((async ({ page }: any) => ({
      items: [],
      meta: { currentPage: page, totalPages: 20 },
    })) as any);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <DirectReplies id="1" onOpenPost={() => {}} />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(getComments).toHaveBeenCalledTimes(6));
    // Without a cap the next page would follow within a few ticks.
    await new Promise((resolve) => { setTimeout(resolve, 50); });
    expect(getComments).toHaveBeenCalledTimes(6);
  });
});
