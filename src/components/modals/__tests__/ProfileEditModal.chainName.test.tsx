import React from 'react';
import {
  fireEvent, render, screen,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { createStore, Provider } from 'jotai';
import { preferredChainNamesAtom } from '@/atoms/walletAtoms';
import { setPendingChainName } from '@/utils/preferredChainName';
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
  return { ...actual, CONFIG: { ...actual.CONFIG, X_OAUTH_CLIENT_ID: '' } };
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

// Owns two names; the second one is linked as the preferred (default) name.
const ownerAccount = {
  address: ADDRESS,
  chain_name: 'firstname12345.chain',
  links: { prefaens: 'secondname12345.chain' },
  names: ['firstname12345.chain', 'secondname12345.chain'],
};

function renderEditor(store = createStore()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <Provider store={store}>
        <ProfileEditModal open onClose={() => {}} address={ADDRESS} />
      </Provider>
    </QueryClientProvider>,
  );
}

describe('ProfileEditModal .chain name section', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Middleware owned-names lookup: fail fast, the form falls back to the account.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    mockGetAccount.mockResolvedValue(ownerAccount);
    mockGetProfile.mockResolvedValue(ownerAccount);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('selects the linked preferred name, not the first owned one', async () => {
    renderEditor();
    expect(await screen.findByRole('combobox')).toHaveTextContent('secondname12345.chain');
  });

  it('keeps the claim entry available for owners of a name', async () => {
    renderEditor();
    await screen.findByRole('combobox');
    expect(screen.queryByPlaceholderText('myuniquename123')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Claim a new .chain name' }));

    expect(screen.getByPlaceholderText('myuniquename123')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveTextContent('secondname12345.chain');
  });

  it('shows a just-picked name the API has not indexed yet', async () => {
    const store = createStore();
    store.set(
      preferredChainNamesAtom,
      setPendingChainName({}, ADDRESS, 'firstname12345.chain'),
    );
    renderEditor(store);
    expect(await screen.findByRole('combobox')).toHaveTextContent('firstname12345.chain');
  });
});
