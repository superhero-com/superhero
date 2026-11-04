import {
  act, fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { changeLanguage } from '@/i18n';
import { PostsService } from '@/api/generated';
import { clearPendingTransactions } from '@/features/pending-transactions/store';
import { trackPublishedReply, watchPendingPosts } from '../../utils/pendingPosts';
import ReplyToFeedItem from '../ReplyToFeedItem';

vi.mock('@/hooks', () => ({ useWallet: () => ({ chainNames: {}, profileDisplayNames: {} }) }));
vi.mock('@/hooks/useCommunityFactory', () => ({ useHashtagAllowedChars: () => undefined }));
vi.mock('@/hooks/useChainName', () => ({ useStorePostSenderChainNames: () => {} }));
vi.mock('@/@components/Address/AddressAvatarWithChainName', () => ({ AddressAvatarWithChainName: () => null }));
vi.mock('../PostTipButton', () => ({ default: () => null }));
vi.mock('../SharePopover', () => ({ default: () => null }));
vi.mock('../BlockchainInfoPopover', () => ({ BlockchainInfoPopover: () => null }));
vi.mock('../DetectedLinkPreview', () => ({ DetectedLinkPreview: () => null }));

const post = (
  id: string,
  content: string,
  parent?: string,
  extra: Record<string, unknown> = {},
) => ({
  id,
  slug: id,
  content,
  sender_address: 'ak_author',
  created_at: '2026-10-10T10:00:00.000Z',
  media: [],
  tx_args: parent ? [{ type: 'string', value: content }, { type: 'list', value: [{ type: 'string', value: `comment:${parent}` }] }] : [],
  total_comments: 0,
  ...extra,
});

// Totals count every reply below a post, as the backend's do.
const thread = (): Record<string, any> => ({
  '1_v3': post('1_v3', 'Original post text', undefined, { total_comments: 5 }),
  '2_v3': post('2_v3', 'First repost text', '1_v3', { total_comments: 1 }),
  '3_v3': post('3_v3', 'Second level reply', '2_v3'),
  '4_v3': post('4_v3', 'Top reply', '1_v3', { total_comments: 2 }),
  '5_v3': post('5_v3', 'Middle reply', '4_v3', { total_comments: 1 }),
  '6_v3': post('6_v3', 'Deepest reply', '5_v3'),
});
let posts = thread();

const addReply = (reply: Record<string, any>, ...above: string[]) => {
  posts = { ...posts, [reply.id]: reply };
  above.forEach((id) => {
    posts[id] = { ...posts[id], total_comments: posts[id].total_comments + 1 };
  });
};

const newClient = (staleTime?: number) => new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime } },
});

const renderItem = (ui: React.ReactElement, client = newClient()) => render(
  <QueryClientProvider client={client}>
    <MemoryRouter>{ui}</MemoryRouter>
  </QueryClientProvider>,
);

beforeEach(() => {
  changeLanguage('en');
  posts = thread();
  vi.spyOn(PostsService, 'getById').mockImplementation((async ({ id }: any) => posts[id]) as any);
  vi.spyOn(PostsService, 'getComments').mockImplementation((async ({ id }: any) => ({
    items: Object.values(posts).filter((p) => (p.tx_args as any[]).some((a) => JSON.stringify(a).includes(`comment:${id}`))),
    meta: { currentPage: 1, totalPages: 1 },
  })) as any);
});

describe('ReplyToFeedItem threads', () => {
  it('shows the original post as well as the direct parent for a reply to a reply', async () => {
    renderItem(<ReplyToFeedItem item={posts['3_v3']} onOpenPost={() => {}} />);
    expect(await screen.findByText('Original post text')).toBeInTheDocument();
    expect(await screen.findByText('First repost text')).toBeInTheDocument();
    expect(screen.getByText('Original post')).toBeInTheDocument();
  });

  it('does not add an original post preview for a direct reply', async () => {
    renderItem(<ReplyToFeedItem item={posts['2_v3']} onOpenPost={() => {}} />);
    expect(await screen.findByText('Original post text')).toBeInTheDocument();
    expect(screen.queryByText('Original post')).not.toBeInTheDocument();
  });

  it('nests replies under the reply they answer when threaded', async () => {
    renderItem(<ReplyToFeedItem item={posts['2_v3']} hideParentContext threadDepth={0} onOpenPost={() => {}} />);
    const nested = await screen.findByText('Second level reply');
    expect(nested.closest('#replies-2_v3')).not.toBeNull();
  });

  it.each([
    ['Middle reply', '5_v3'],
    ['Deepest reply', '6_v3'],
  ])('opens only the clicked nested reply (%s)', async (text, slug) => {
    const onOpenPost = vi.fn();
    renderItem(<ReplyToFeedItem item={posts['4_v3']} hideParentContext threadDepth={0} onOpenPost={onOpenPost} />);
    fireEvent.click(await screen.findByText(text));
    expect(onOpenPost).toHaveBeenCalledTimes(1);
    expect(onOpenPost).toHaveBeenCalledWith(slug);
  });

  it('opens a nested reply from the keyboard', async () => {
    const onOpenPost = vi.fn();
    renderItem(<ReplyToFeedItem item={posts['4_v3']} hideParentContext threadDepth={0} onOpenPost={onOpenPost} />);
    const card = (await screen.findByText('Deepest reply')).closest('article')!;
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(onOpenPost).toHaveBeenCalledTimes(1);
    expect(onOpenPost).toHaveBeenCalledWith('6_v3');
  });

  it('refreshes nested replies from the top-level reply\'s poll alone', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      renderItem(<ReplyToFeedItem item={posts['4_v3']} hideParentContext threadDepth={0} onOpenPost={() => {}} />);
      await screen.findByText('Deepest reply');
      await act(() => vi.advanceTimersByTimeAsync(1000));
      vi.mocked(PostsService.getComments).mockClear();
      addReply(post('7_v3', 'Newest reply', '5_v3'), '5_v3', '4_v3', '1_v3');

      await act(() => vi.advanceTimersByTimeAsync(120_000));

      expect(await screen.findByText('Newest reply')).toBeInTheDocument();
      const middleCount = document.querySelector('#post-5_v3 > .feed-post__content > .feed-post__actions .feed-post__reply');
      expect(middleCount?.textContent).toMatch(/^2/);
      // The top-level reply's poll, then only the list whose total grew.
      const ids = vi.mocked(PostsService.getComments).mock.calls.map(([args]) => (args as any).id);
      expect(ids.sort()).toEqual(['4_v3', '5_v3']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('leaves a nested reply\'s list alone when its total hasn\'t changed', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      renderItem(<ReplyToFeedItem item={posts['4_v3']} hideParentContext threadDepth={0} onOpenPost={() => {}} />);
      await screen.findByText('Deepest reply');
      await act(() => vi.advanceTimersByTimeAsync(1000));
      vi.mocked(PostsService.getComments).mockClear();
      addReply(post('7_v3', 'Newest reply', '4_v3'), '4_v3', '1_v3');

      await act(() => vi.advanceTimersByTimeAsync(120_000));

      expect((await screen.findByText('Newest reply')).closest('#replies-4_v3')).not.toBeNull();
      const ids = vi.mocked(PostsService.getComments).mock.calls.map(([args]) => (args as any).id);
      expect(ids).toEqual(['4_v3']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows a feed post\'s reply total without loading its replies', async () => {
    const client = newClient();
    const item = posts['1_v3'];
    renderItem(
      <ReplyToFeedItem
        item={item}
        commentCount={item.total_comments}
        allowInlineRepliesToggle={false}
        onOpenPost={() => {}}
      />,
      client,
    );

    expect(screen.getByRole('button', { name: '5 replies' })).toBeInTheDocument();
    await waitFor(() => expect(client.isFetching()).toBe(0));
    expect(PostsService.getComments).not.toHaveBeenCalled();
  });

  it.each([
    ['in a feed', undefined],
    ['at the top of a thread', 0],
  ])('keeps the app\'s staleTime for a post %s', async (_, threadDepth) => {
    // The app's default (main.tsx).
    const client = newClient(5 * 60 * 1000);
    const ui = <ReplyToFeedItem item={posts['4_v3']} hideParentContext threadDepth={threadDepth} onOpenPost={() => {}} />;
    const { unmount } = renderItem(ui, client);
    await waitFor(() => expect(client.isFetching()).toBe(0));
    vi.mocked(PostsService.getComments).mockClear();

    unmount();
    renderItem(ui, client);
    await waitFor(() => expect(client.isFetching()).toBe(0));

    expect(PostsService.getComments).not.toHaveBeenCalled();
  });

  it('keeps a reply the backend doesn\'t have yet when a nested reply\'s list refetches', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const client = newClient();
    const stop = watchPendingPosts(client);
    trackPublishedReply({
      account: 'ak_author', txHash: 'th_reply', parentId: '5_v3', reply: post('8_v3', 'Pending reply', '5_v3'),
    });
    try {
      renderItem(<ReplyToFeedItem item={posts['4_v3']} hideParentContext threadDepth={0} onOpenPost={() => {}} />, client);
      await screen.findByText('Deepest reply');
      addReply(post('7_v3', 'Newest reply', '5_v3'), '5_v3', '4_v3', '1_v3');

      await act(() => vi.advanceTimersByTimeAsync(120_000));

      expect((await screen.findByText('Newest reply')).closest('#replies-5_v3')).not.toBeNull();
      expect(screen.getByText('Pending reply').closest('#replies-5_v3')).not.toBeNull();
    } finally {
      stop();
      clearPendingTransactions();
      vi.useRealTimers();
    }
  });
});
