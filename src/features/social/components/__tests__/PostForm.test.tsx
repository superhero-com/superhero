import React from 'react';
import {
  fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';

import { TransactionNotificationProvider } from '../../../transaction-notification/transaction-notification.context';
import {
  clearPendingTransactions,
  listPendingTransactions,
} from '../../../pending-transactions/store';
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
  default: ({ children, ...props }: any) => <button type="button" {...props}>{children}</button>,
}));

vi.mock('../../../../components/ConnectWalletButton', () => ({
  ConnectWalletButton: (props: any) => <button type="button" {...props}>Connect</button>,
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

// The composer reads the collection charset for the mention picker; isolate the
// unit test from the factory-schema loader (it fetches via AppService).
vi.mock('../../../../hooks/useCommunityFactory', () => ({
  useHashtagAllowedChars: () => '',
}));

vi.mock('../../../../libs/initializeContractTyped', () => ({
  initializeContractTyped: (...args: any[]) => mockInitializeContractTyped(...args),
}));

vi.mock('../../../../api/generated', () => ({
  PostsService: {
    getById: (...args: any[]) => mockGetById(...args),
  },
  // TokenTagOptionsBar reads the live collection alphabet, which loads the factory schema.
  AppService: {
    getFactory: vi.fn().mockResolvedValue({ address: 'ct_factory' }),
  },
}));

vi.mock('../../../../config', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../../../config')>();
  return {
    ...mod,
    CONFIG: {
      ...mod.CONFIG,
      CONTRACT_V3_ADDRESS: 'ct_tip',
    },
  };
});

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

  it.each(['en', null])('updates only eligible feed caches when the indexed language is %s', async (language) => {
    mockGetById.mockResolvedValue({
      ...(await mockGetById()), language,
    });
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
    const filteredKeys = ['en', 'ar'].map((code) => ['posts', { sortBy: 'latest', language: code }]);
    filteredKeys.forEach((key) => queryClient.setQueryData(key, {
      pageParams: [1], pages: [{ items: [], meta: { currentPage: 1, totalPages: 1 } }],
    }));
    queryClient.setQueryData(['topic-by-name', '#nancy'], {
      posts: [{ id: 'existing-topic-post' }],
      post_count: 1,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <TransactionNotificationProvider>
          <PostForm
            onSuccess={onSuccess}
            onPostCreated={onPostCreated}
            requiredHashtag="#nancy"
            showEmojiPicker={false}
            showGifInput={false}
            showImageInput={false}
            showMediaFeatures={false}
          />
        </TransactionNotificationProvider>
      </QueryClientProvider>,
    );

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '#NANCY hello world' },
    });
    const form = screen.getByRole('textbox').closest('form');
    expect(form).toBeTruthy();
    fireEvent.submit(form!);

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

    expect(queryClient.getQueryData<any>(filteredKeys[0]).pages[0].items)
      .toHaveLength(language === 'en' ? 1 : 0);
    expect(queryClient.getQueryData<any>(filteredKeys[1]).pages[0].items).toHaveLength(0);
    const topicFeed = queryClient.getQueryData<any>(['topic-by-name', '#nancy']);
    expect(topicFeed.posts[0]).toEqual(expect.objectContaining({
      id: 'th_post_v3',
      tx_hash: 'th_post',
    }));
    expect(topicFeed.post_count).toBe(2);
    // Already indexed: nothing left to wait for.
    expect(listPendingTransactions({ kind: 'create_post' })).toEqual([]);
  });

  describe('before the backend has it', () => {
    beforeEach(() => {
      clearPendingTransactions();
      mockInitializeContractTyped.mockResolvedValue({
        post_without_tip: vi.fn().mockResolvedValue({ decodedResult: '42', hash: 'th_mined' }),
      });
      mockGetById.mockRejectedValue(new Error('Not found'));
    });

    afterEach(() => {
      clearPendingTransactions();
    });

    const renderForm = (props: Record<string, unknown>) => render(
      <QueryClientProvider client={queryClient}>
        <TransactionNotificationProvider>
          <PostForm
            showEmojiPicker={false}
            showGifInput={false}
            showImageInput={false}
            showMediaFeatures={false}
            {...props}
          />
        </TransactionNotificationProvider>
      </QueryClientProvider>,
    );

    const submit = (value: string) => {
      fireEvent.change(screen.getByRole('textbox'), { target: { value } });
      fireEvent.submit(screen.getByRole('textbox').closest('form')!);
    };

    it('shows the post it built and keeps it for a reload', async () => {
      const onSuccess = vi.fn();
      renderForm({ onSuccess, requiredHashtag: '#nancy' });
      submit('#NANCY gm');
      await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));

      const latestKey = ['posts', {
        limit: 10, sortBy: 'latest', search: '', filterBy: 'all',
      }];
      const [newest] = queryClient.getQueryData<any>(latestKey).pages[0].items;
      expect(newest).toEqual(expect.objectContaining({
        id: '42_v3', content: '#NANCY gm', tx_hash: 'th_mined',
      }));
      const [pending] = listPendingTransactions({ kind: 'create_post' });
      expect(pending).toEqual(expect.objectContaining({
        account: 'ak_author', txHash: 'th_mined', step: 'confirmed',
      }));
      expect(pending.meta).toEqual(expect.objectContaining({ postId: '42_v3', topic: '#nancy' }));
      expect(JSON.parse(pending.meta.post!))
        .toEqual(expect.objectContaining({ id: '42_v3', content: '#NANCY gm' }));
    });

    it('does the same for a reply, under its parent', async () => {
      const onCommentAdded = vi.fn();
      renderForm({ isPost: false, postId: '7', onCommentAdded });
      submit('nice');
      await waitFor(() => expect(onCommentAdded).toHaveBeenCalledTimes(1));

      expect(queryClient.getQueryData<any>(['comment-replies', '7_v3'])).toEqual([
        expect.objectContaining({ id: '42_v3', content: 'nice' }),
      ]);
      const [pending] = listPendingTransactions({ kind: 'create_comment' });
      expect(pending.meta).toEqual(expect.objectContaining({ postId: '42_v3', parentId: '7_v3' }));
    });
  });
});
