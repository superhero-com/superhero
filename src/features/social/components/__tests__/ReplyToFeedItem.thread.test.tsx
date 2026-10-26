import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { changeLanguage } from '@/i18n';
import { PostsService } from '@/api/generated';
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

const posts: Record<string, any> = {
  '1_v3': post('1_v3', 'Original post text'),
  '2_v3': post('2_v3', 'First repost text', '1_v3', { total_comments: 1 }),
  '3_v3': post('3_v3', 'Second level reply', '2_v3'),
};

const renderItem = (ui: React.ReactElement) => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter>{ui}</MemoryRouter>
  </QueryClientProvider>,
);

beforeEach(() => {
  changeLanguage('en');
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
});
