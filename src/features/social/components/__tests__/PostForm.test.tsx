import React from 'react';
import {
  fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PostForm from '../PostForm';

const mockInitializeContractTyped = vi.fn();
const mockGetById = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (key === 'social.post') return 'Post';
      if (key === 'social.posting') return 'Posting';
      if (key === 'social.postReply') return 'Post Reply';
      if (key === 'social.emoji') return 'Emoji';
      if (key === 'social.gif') return 'GIF';
      if (key === 'social.moreSoon') return 'More soon';
      if (key === 'social.postNeedsToInclude') return `Needs ${String(options?.hashtag || '')}`;
      if (key === 'social.add') return 'Add';
      if (key === 'forms.connectWalletToPost') return 'Connect wallet to post';
      if (key === 'aria.media') return 'media';
      return key;
    },
  }),
}));

vi.mock('../../../../components/AeButton', () => ({
  default: ({ children, loading, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('../../../../components/ConnectWalletButton', () => ({
  ConnectWalletButton: (props: any) => <button {...props}>Connect</button>,
}));

vi.mock('../../../../@components/Address/AddressAvatarWithChainName', () => ({
  AddressAvatarWithChainName: () => <div data-testid="avatar" />,
}));

vi.mock('../GifSelectorDialog', () => ({
  GifSelectorDialog: () => null,
}));

vi.mock('../../../../hooks/useAeSdk', () => ({
  useAeSdk: () => ({
    sdk: { id: 'sdk' },
  }),
}));

vi.mock('../../../../hooks/useAccount', () => ({
  useAccount: () => ({
    activeAccount: 'ak_author',
  }),
}));

vi.mock('../../../../libs/initializeContractTyped', () => ({
  initializeContractTyped: (...args: any[]) => mockInitializeContractTyped(...args),
}));

vi.mock('../../../../api/generated', () => ({
  PostsService: {
    getById: (...args: any[]) => mockGetById(...args),
  },
}));

vi.mock('../../../../config', () => ({
  CONFIG: {
    CONTRACT_V3_ADDRESS: 'ct_tip',
  },
}));

describe('PostForm', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    const matchMedia = vi.fn().mockImplementation(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: matchMedia,
    });

    Object.defineProperty(window, 'requestAnimationFrame', {
      writable: true,
      value: (cb: FrameRequestCallback) => {
        cb(0);
        return 0;
      },
    });

    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: () => ({
        font: '',
        measureText: () => ({ width: 0 }),
      }),
    });

    mockInitializeContractTyped.mockResolvedValue({
      post_without_tip: vi.fn().mockResolvedValue({ decodedResult: 'th_post' }),
    });

    mockGetById.mockResolvedValue({
      id: 'th_post_v3',
      content: '#NANCY hello world',
      sender_address: 'ak_author',
      media: [],
      total_comments: 0,
      tx_hash: 'th_post',
      topics: ['#nancy'],
    });
  });

  it('creates a post and optimistically updates the latest and topic caches', async () => {
    const onSuccess = vi.fn();
    const onPostCreated = vi.fn();

    const latestKey = ['posts', {
      limit: 10,
      sortBy: 'latest',
      search: '',
      filterBy: 'all',
    }];
    queryClient.setQueryData(latestKey, {
      pageParams: [1],
      pages: [{
        items: [{ id: 'existing-post', tx_hash: 'th_existing' }],
        meta: { currentPage: 1, totalPages: 1 },
      }],
    });
    queryClient.setQueryData(['topic-by-name', '#nancy'], {
      posts: [{ id: 'existing-topic-post' }],
      post_count: 1,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <PostForm
          onSuccess={onSuccess}
          onPostCreated={onPostCreated}
          requiredHashtag="#nancy"
          showEmojiPicker={false}
          showGifInput={false}
          showMediaFeatures={false}
        />
      </QueryClientProvider>,
    );

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '#NANCY hello world' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Post' }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    expect(onPostCreated).toHaveBeenCalledTimes(1);
    expect(mockGetById).toHaveBeenCalledWith({ id: 'th_post_v3' });

    const latestFeed = queryClient.getQueryData<any>(latestKey);
    expect(latestFeed.pages[0].items[0]).toEqual(expect.objectContaining({
      id: 'th_post_v3',
      tx_hash: 'th_post',
    }));

    const topicFeed = queryClient.getQueryData<any>(['topic-by-name', '#nancy']);
    expect(topicFeed.posts[0]).toEqual(expect.objectContaining({
      id: 'th_post_v3',
      tx_hash: 'th_post',
    }));
    expect(topicFeed.post_count).toBe(2);
  });
});
