import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import type { PostDto } from '../../../../api/generated';
import ReplyToFeedItem from '../ReplyToFeedItem';
import TokenCreatedActivityItem from '../TokenCreatedActivityItem';
import TradeActivityItem from '../TradeActivityItem';

const mocks = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock('react-router-dom', () => ({ useNavigate: () => mocks.navigate }));
vi.mock('@tanstack/react-query', () => ({ useQuery: () => ({}) }));
vi.mock('../../../../api/generated', () => ({
  PostsService: {
    getById: vi.fn().mockResolvedValue({ sender_address: 'ak_parent', content: 'Parent post' }),
  },
}));
vi.mock('../../../../hooks', () => ({
  useWallet: () => ({ chainNames: {}, profileDisplayNames: {} }),
}));
vi.mock('../../../../hooks/useCommunityFactory', () => ({ useHashtagAllowedChars: () => '' }));
vi.mock('../../../../hooks/useChainName', () => ({ useStorePostSenderChainNames: () => {} }));
vi.mock('@/components/AspectMedia', () => ({ AspectMedia: () => null }));
vi.mock('@/components/social/PostHashtagLink', () => ({ default: () => null }));
vi.mock('@/utils/linkify', () => ({ linkify: (text: string) => text }));
vi.mock('@/utils/common', () => ({ formatFractionalPrice: () => null }));
vi.mock('@/utils/address', () => ({ formatAddress: (address: string) => address }));
vi.mock('@/utils/number', () => ({ formatCompactNumber: (value: string) => value }));
vi.mock('@/@components/Address/AddressAvatarWithChainName', () => ({ AddressAvatarWithChainName: () => null }));
vi.mock('../BlockchainInfoPopover', () => ({ BlockchainInfoPopover: () => null }));
vi.mock('../InlineCopyButton', () => ({ default: () => null }));
vi.mock('../SharePopover', () => ({ default: () => null }));
vi.mock('../../../../hooks/useModal', () => ({ useModal: () => ({ openModal: vi.fn() }) }));
vi.mock('../../hooks/usePostTipSummary', () => ({ usePostTipSummary: () => ({}) }));
vi.mock('../DetectedLinkPreview', () => ({ DetectedLinkPreview: () => null }));
vi.mock('../../hooks/useLinkDetection', () => ({ useLinkDetection: () => null }));

const post = {
  id: 'post_v3',
  sender_address: 'ak_author',
  content: 'Hello',
  created_at: '2026-09-10T10:00:00Z',
  media: [],
  total_comments: 0,
} as unknown as PostDto;

describe('feed card keyboard activation', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(['Enter', ' '])('leaves %s on a nested tip button to the button itself', (key) => {
    const onOpenPost = vi.fn();
    render(<ReplyToFeedItem item={post} onOpenPost={onOpenPost} />);

    expect(fireEvent.keyDown(screen.getByRole('button', { name: 'Tip post' }), { key })).toBe(true);
    expect(onOpenPost).not.toHaveBeenCalled();

    fireEvent.keyDown(screen.getByRole('button', { name: 'Open post' }), { key });
    expect(onOpenPost).toHaveBeenCalledWith('post');
  });

  it('preserves the author link and encodes token names when opening a creation activity', () => {
    render(<TokenCreatedActivityItem item={{ ...post, id: 'token-created:A%23B:ct_token:date_v3' }} />);
    expect(fireEvent.keyDown(screen.getByRole('link', { name: 'ak_author' }), { key: 'Enter' })).toBe(true);
    expect(mocks.navigate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTitle('Buy'));
    expect(mocks.navigate).toHaveBeenCalledWith('/trends/tokens/A%23B');
  });

  it('renders translated parent context labels on a reply', async () => {
    render(<ReplyToFeedItem item={{ ...post, media: ['comment:parent'] }} onOpenPost={vi.fn()} />);
    expect(await screen.findByText('Replying to')).toBeInTheDocument();
    expect(screen.getByText('Show post')).toBeInTheDocument();
  });

  it('does not replace keyboard Copy Trade with navigation to the plain token page', () => {
    render(<TradeActivityItem item={{
      id: 'trade', created_at: post.created_at, account: 'ak_author', volume: '5', token: { name: 'TEST' } as any,
    }}
    />);
    const copyTrade = screen.getByRole('button', { name: 'Copy Trade' });

    expect(fireEvent.keyDown(copyTrade, { key: 'Enter' })).toBe(true);
    expect(mocks.navigate).not.toHaveBeenCalled();
    fireEvent.click(copyTrade);
    expect(mocks.navigate).toHaveBeenCalledWith('/trends/tokens/TEST?trade=buy&amount=5&showTrade=1');
  });
});
