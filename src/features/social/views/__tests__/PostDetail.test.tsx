import {
  act, fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  MemoryRouter, Route, Routes, useLocation,
} from 'react-router-dom';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { changeLanguage } from '@/i18n';
import PostDetail from '../PostDetail';

vi.mock('@/hooks/useAeSdk', () => ({ useAeSdk: () => ({ activeNetwork: {} }) }));
vi.mock('@/hooks', () => ({ useWallet: () => ({ chainNames: {} }) }));
vi.mock('../../hooks/usePostTipSummary', () => ({ usePostTipSummary: () => ({}) }));
vi.mock('../../hooks/usePostTips', () => ({ usePostTips: () => ({ data: [] }) }));
vi.mock('../../../../seo/Head', () => ({ Head: () => null }));
vi.mock('../../../../components/layout/LeftRail', () => ({ default: () => null }));
vi.mock('../../../../components/layout/RightRail', () => ({ default: () => null }));
vi.mock('../../../../components/layout/Shell', () => ({ default: () => null }));
vi.mock('../../components/ReplyToFeedItem', () => ({
  default: ({ onReply }: { onReply?: () => void }) => (
    <button type="button" onClick={onReply}>Reply to this post</button>
  ),
}));
vi.mock('../../components/CommentForm', () => ({
  default: () => <textarea aria-label="Reply message" />,
}));
vi.mock('../../components/DirectReplies', () => ({ default: () => <p>Existing replies</p> }));

const post = {
  id: '12954_v3',
  slug: 'weekend-post',
  content: 'Weekend on-chain data.',
  sender_address: 'ak_author',
  media: [],
  total_comments: 0,
};
const scrollTo = vi.fn();
const scrollIntoView = vi.fn();
const Destination = () => (
  <div>
    {useLocation().pathname}
    {useLocation().search}
  </div>
);

beforeEach(() => {
  changeLanguage('en');
  scrollTo.mockClear();
  scrollIntoView.mockClear();
  window.scrollTo = scrollTo;
  HTMLElement.prototype.scrollIntoView = scrollIntoView;
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => { callback(0); return 1; });
});

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  client.setQueryData(['post', post.slug], post);
  client.setQueryData(['post-ancestors', post.id, null], []);
  client.setQueryData(['post-desc-count', post.id], 0);
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[{
        pathname: `/post/${post.slug}`, state: { fromFeedUrl: '/?feed=latest' },
      }]}
      >
        <Routes>
          <Route path="/post/:slug" element={<PostDetail standalone={false} />} />
          <Route path="/" element={<Destination />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return client;
}

describe('post detail navigation', () => {
  it('takes Reply directly to the composer, which precedes existing replies', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Reply to this post' }));
    const composer = screen.getByRole('textbox', { name: 'Reply message' });
    expect(composer).toHaveFocus();
    expect(scrollIntoView).toHaveBeenCalled();
    expect(composer.compareDocumentPosition(screen.getByText('Existing replies')))
      .toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('preserves the originating feed filter when going back', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('/?feed=latest')).toBeInTheDocument();
  });

  it('does not reposition the reader when cached post data refreshes', async () => {
    const client = setup();
    await waitFor(() => expect(scrollTo).toHaveBeenCalled());
    scrollTo.mockClear();
    scrollIntoView.mockClear();
    await act(async () => client.setQueryData(['post', post.slug], { ...post, content: 'Refreshed data' }));
    expect(scrollTo).not.toHaveBeenCalled();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
