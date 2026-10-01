import React from 'react';
import {
  act, render, screen, waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import {
  X_LINK_CHANGES_STORAGE_KEY, X_LINK_CHANGE_POLL_MS, clearConfirmedXLinks,
  rememberConfirmedXLink, trackXLinkChange,
} from '@/utils/confirmedXLink';
import ProfileEditModal from '../ProfileEditModal';

const ADDRESS = 'ak_owner';

const mockGetAccount = vi.fn();
const mockGetProfile = vi.fn();

// The chain is asked before the API; these tests are about the API.
vi.mock('@/utils/apiRead', async (importOriginal) => {
  const actual: any = await importOriginal();
  return { ...actual, isTransactionMined: vi.fn().mockResolvedValue(false) };
});

vi.mock('@/config', async (importOriginal) => {
  const actual: any = await importOriginal();
  return { ...actual, CONFIG: { ...actual.CONFIG, X_OAUTH_CLIENT_ID: 'test-client' } };
});

vi.mock('@/api/backend', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    SuperheroApi: {
      ...actual.SuperheroApi,
      getAccount: (...args: any[]) => mockGetAccount(...args),
    },
  };
});

// Stable across renders, like the real hook: the editor's load effect depends
// on these functions, and fresh ones every render would re-run it forever.
const mockProfileApi = {
  getProfile: (...args: any[]) => mockGetProfile(...args),
  getProfileOnChain: () => Promise.resolve(null),
  linkBio: () => {},
  unlinkBio: () => {},
  linkSite: () => {},
  unlinkSite: () => {},
  linkPreferredAensName: () => {},
  unlinkPreferredAensName: () => {},
  unlinkXAccount: () => {},
  canEdit: true,
};

vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => mockProfileApi,
}));

const mockClaimApi = {
  claimSponsoredChainName: () => {},
  claimSelfFundedChainName: () => {},
  claimAddress: ADDRESS,
  canClaim: false,
  checkNameAvailability: () => {},
};

vi.mock('@/hooks/useClaimChainName', () => ({
  useClaimChainName: () => mockClaimApi,
}));

const mockAeSdk = { activeAccount: ADDRESS };
vi.mock('@/hooks/useAeSdk', () => ({ useAeSdk: () => mockAeSdk }));
const mockModal = { openModal: () => {} };
vi.mock('@/hooks/useModal', () => ({ useModal: () => mockModal }));
const mockToast = { push: () => {} };
vi.mock('../../ToastProvider', () => ({ useToast: () => mockToast }));
const mockRefresh = () => {};
vi.mock('@/hooks/useRefreshXLinkState', () => ({ useRefreshXLinkState: () => mockRefresh }));
vi.mock('@/@components/Address/AddressAvatarWithChainName', () => ({
  AddressAvatarWithChainName: () => null,
}));

const mockNotifications = {
  notificationState: { status: 'idle' },
  notifySubmitted: () => {},
  notifyPending: () => {},
  notifyPendingTx: () => {},
  notifyConfirmed: () => {},
  notifyError: () => {},
};

vi.mock('@/features/transaction-notification', async (importOriginal) => {
  const actual: any = await importOriginal();
  return { ...actual, useTransactionNotification: () => mockNotifications };
});

const linkedAccount = { address: ADDRESS, links: { x: 'untracenetwork' } };

function renderEditor() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ProfileEditModal open onClose={() => {}} address={ADDRESS} />
    </QueryClientProvider>,
  );
}

describe('ProfileEditModal X section', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearConfirmedXLinks();
    // Middleware chain-name lookups: fail fast, the form falls back.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    mockGetAccount.mockResolvedValue(linkedAccount);
    mockGetProfile.mockResolvedValue(linkedAccount);
  });

  afterEach(() => {
    clearConfirmedXLinks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('shows a linked X account', async () => {
    renderEditor();
    expect(await screen.findByText('@untracenetwork')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Link account' })).not.toBeInTheDocument();
  });

  it('keeps an unlink that confirms while the editor is still loading', async () => {
    // load() reads the account ("linked"), then waits on more requests. Hold
    // one of them open, confirm the unlink meanwhile, then let load finish
    // and write its now-stale "linked".
    let finishProfile: (value: unknown) => void = () => {};
    mockGetProfile.mockReturnValue(new Promise((resolve) => { finishProfile = resolve; }));
    renderEditor();
    await waitFor(() => expect(mockGetProfile).toHaveBeenCalled());
    expect(mockGetAccount).toHaveBeenCalled();

    rememberConfirmedXLink(ADDRESS, null);
    await act(async () => { finishProfile(linkedAccount); });

    expect(await screen.findByRole('button', { name: 'Link account' })).toBeInTheDocument();
    expect(screen.queryByText('@untracenetwork')).not.toBeInTheDocument();
  });

  it('keeps a confirmed unlink when reopened before the API catches up', async () => {
    rememberConfirmedXLink(ADDRESS, null);
    renderEditor();

    expect(await screen.findByRole('button', { name: 'Link account' })).toBeInTheDocument();
    expect(screen.queryByText('@untracenetwork')).not.toBeInTheDocument();
  });

  it('shows an unlink on its way, offering neither Link nor Unlink, and settles it in place', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const readLinkedUsername = vi.fn().mockResolvedValue('untracenetwork');
    trackXLinkChange(ADDRESS, { kind: 'unlink', txHash: 'th_unlink', username: 'untracenetwork' }, { readLinkedUsername });
    renderEditor();

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('Unlinking @untracenetwork…');
    expect(status).toHaveTextContent('This takes a while. You can leave and come back, then refresh later.');
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /unlink @untracenetwork/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Link account' })).not.toBeInTheDocument();

    // The backend drops the handle: the open editor switches over by itself.
    readLinkedUsername.mockResolvedValue(null);
    await act(async () => { vi.advanceTimersByTime(X_LINK_CHANGE_POLL_MS); });

    expect(await screen.findByRole('button', { name: 'Link account' })).toBeInTheDocument();
    expect(screen.queryByText('@untracenetwork')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows an unlink sent before a reload as on its way, although the account still lists the handle', async () => {
    window.localStorage.setItem(X_LINK_CHANGES_STORAGE_KEY, JSON.stringify({
      [ADDRESS]: {
        kind: 'unlink', txHash: 'th_unlink', username: 'untracenetwork', startedAt: Date.now() - 60_000,
      },
    }));
    renderEditor();

    expect(await screen.findByRole('status')).toHaveTextContent('Unlinking @untracenetwork…');
    expect(screen.queryByRole('button', { name: /unlink @untracenetwork/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Link account' })).not.toBeInTheDocument();
  });

  it('shows a link on its way instead of offering "Link account" again', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    // The account record has not caught up: it still says unlinked.
    mockGetAccount.mockResolvedValue({ address: ADDRESS, links: {} });
    mockGetProfile.mockResolvedValue({ address: ADDRESS, links: {} });
    const readLinkedUsername = vi.fn().mockResolvedValue(null);
    trackXLinkChange(ADDRESS, { kind: 'link', txHash: 'th_link' }, { readLinkedUsername });
    renderEditor();

    expect(await screen.findByRole('status')).toHaveTextContent('Linking your X account…');
    expect(screen.queryByRole('button', { name: 'Link account' })).not.toBeInTheDocument();

    readLinkedUsername.mockResolvedValue('untracenetwork');
    await act(async () => { vi.advanceTimersByTime(X_LINK_CHANGE_POLL_MS); });

    expect(await screen.findByText('@untracenetwork')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /unlink @untracenetwork/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Link account' })).not.toBeInTheDocument();
  });
});
