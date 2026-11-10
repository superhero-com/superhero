import React from 'react';
import {
  act, fireEvent, render, screen,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { createStore, Provider } from 'jotai';
import BigNumber from 'bignumber.js';
import { chainNamesAtom } from '@/atoms/walletAtoms';
import ChainNameStep from '../ChainNameStep';
import { resetFreeClaimOffer } from '../chainNameStepGate';

const ADDRESS = 'ak_gAWT7XdGs2wtyCMPJe1K1SneofRFeDGf6Sp5ueftdev36XwHH';
const NAME = 'mynewname1234';

const mockCheckSponsorship = vi.fn();
vi.mock('@/api/backend', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    SuperheroApi: {
      ...actual.SuperheroApi,
      checkChainNameSponsorship: (...args: any[]) => mockCheckSponsorship(...args),
    },
  };
});

const mockClaim = {
  canClaim: true,
  checkNameAvailability: vi.fn(),
  claimSponsoredChainName: vi.fn(),
  claimSelfFundedChainName: vi.fn(),
};
vi.mock('@/hooks/useClaimChainName', () => ({ useClaimChainName: () => mockClaim }));

// The real estimate builds AENS transactions, which jsdom's Uint8Array cannot
// feed to the SDK; the browser computes it for real. 0.0215 AE stands in here.
const mockPrice = vi.fn();
vi.mock('@/utils/claimChainName', async (importOriginal) => {
  const actual: any = await importOriginal();
  return { ...actual, computeSelfFundedClaimAe: (name: string) => mockPrice(name) };
});

const mockGetBalance = vi.fn();
const mockAeSdk = { sdk: { getBalance: (...args: any[]) => mockGetBalance(...args) } };
vi.mock('@/hooks/useAeSdk', () => ({ useAeSdk: () => mockAeSdk }));

const mockNotifications = {
  notifySubmitted: vi.fn(),
  notifyPending: vi.fn(),
  notifyConfirmed: vi.fn(),
  notifyError: vi.fn(),
};
vi.mock('@/features/transaction-notification', async (importOriginal) => {
  const actual: any = await importOriginal();
  return { ...actual, useTransactionNotification: () => mockNotifications };
});

const sponsored = (sponsorable: boolean) => ({
  name: `${NAME}.chain`,
  sponsorable,
  sponsor_configured: true,
  sponsor_balance_aettos: null,
  required_balance_aettos: '0',
  reason: null,
});

function renderStep(onDone = vi.fn(), store = createStore()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <Provider store={store}>
        <ChainNameStep address={ADDRESS} onDone={onDone} checkDelayMs={0} />
      </Provider>
    </QueryClientProvider>,
  );
  return { onDone, store };
}

async function type(value: string) {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value } });
  // Debounce (0 ms) plus the two lookups.
  await act(async () => { await new Promise((resolve) => { setTimeout(resolve, 5); }); });
}

describe('ChainNameStep', () => {
  beforeEach(() => {
    resetFreeClaimOffer();
    mockClaim.canClaim = true;
    mockClaim.checkNameAvailability.mockResolvedValue(true);
    mockCheckSponsorship.mockResolvedValue(sponsored(true));
    mockGetBalance.mockResolvedValue('0');
    mockPrice.mockReturnValue(new BigNumber('0.0215'));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('leads with a free name when the sponsor can pay for one', async () => {
    renderStep();
    expect(await screen.findByRole('heading', { name: 'Get your free .chain name' })).toBeInTheDocument();
    expect(screen.getByText(/Superhero pays the network fee/)).toBeInTheDocument();
    expect(mockCheckSponsorship).toHaveBeenCalledWith('a'.repeat(13));
  });

  it('makes no free promise when the sponsor cannot pay', async () => {
    mockCheckSponsorship.mockResolvedValue(sponsored(false));
    renderStep();
    await act(async () => { await new Promise((resolve) => { setTimeout(resolve, 5); }); });
    expect(screen.getByRole('heading', { name: 'Pick your .chain name' })).toBeInTheDocument();
    expect(screen.queryByText(/Superhero pays the network fee/)).not.toBeInTheDocument();
  });

  it('makes no free promise when the sponsor check fails', async () => {
    mockCheckSponsorship.mockRejectedValue(new Error('offline'));
    renderStep();
    await act(async () => { await new Promise((resolve) => { setTimeout(resolve, 5); }); });
    expect(screen.getByRole('heading', { name: 'Pick your .chain name' })).toBeInTheDocument();
  });

  it('asks for a longer name before checking anything', async () => {
    renderStep();
    await type('short');
    expect(screen.getByText('5/13 characters before .chain')).toBeInTheDocument();
    expect(mockClaim.checkNameAvailability).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Claim' })).toBeDisabled();
  });

  it('rejects characters a name cannot have', async () => {
    renderStep();
    await type('bad_name_with_underscore');
    expect(screen.getByText(/can use letters, numbers, and hyphens/)).toBeInTheDocument();
    expect(mockClaim.checkNameAvailability).not.toHaveBeenCalled();
  });

  it('says when the name is taken and blocks the claim', async () => {
    mockClaim.checkNameAvailability.mockResolvedValue(false);
    renderStep();
    await type(NAME);
    expect(screen.getByText('That .chain name is already taken. Try another one.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Claim' })).toBeDisabled();
  });

  it('shows Free for a sponsored name and claims it through the sponsored hook', async () => {
    mockClaim.claimSponsoredChainName.mockImplementation(async ({ onSubmitted }) => {
      onSubmitted?.({ status: 'pending', name: `${NAME}.chain` });
      return { status: 'completed', name: `${NAME}.chain` };
    });
    const { onDone, store } = renderStep();
    await type(NAME);

    expect(screen.getByText('Available')).toBeInTheDocument();
    expect(screen.getByText('Free')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Claim for free' }));
    });

    expect(mockClaim.claimSponsoredChainName).toHaveBeenCalledWith(
      expect.objectContaining({ name: NAME }),
    );
    expect(mockClaim.claimSelfFundedChainName).not.toHaveBeenCalled();
    expect(await screen.findByText(`${NAME}.chain is yours`)).toBeInTheDocument();
    expect(store.get(chainNamesAtom)[ADDRESS]).toBe(`${NAME}.chain`);

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onDone).toHaveBeenCalledWith('claimed');
  });

  it('shows the AE price for a paid name and buys it through the self-funded hook', async () => {
    mockCheckSponsorship.mockResolvedValue(sponsored(false));
    mockGetBalance.mockResolvedValue('5000000000000000000'); // 5 AE
    mockClaim.claimSelfFundedChainName.mockResolvedValue({ name: `${NAME}.chain` });
    renderStep();
    await type(NAME);

    expect(mockPrice).toHaveBeenCalledWith(`${NAME}.chain`);
    expect(screen.getByText('≈ 0.0215 AE')).toBeInTheDocument();
    expect(screen.queryByText('Free')).not.toBeInTheDocument();
    const buy = await screen.findByRole('button', { name: 'Buy for ≈ 0.0215 AE' });
    expect(buy).toBeEnabled();
    await act(async () => { fireEvent.click(buy); });

    expect(mockClaim.claimSelfFundedChainName).toHaveBeenCalledWith(
      expect.objectContaining({ name: NAME }),
    );
    expect(mockClaim.claimSponsoredChainName).not.toHaveBeenCalled();
    expect(await screen.findByText(`${NAME}.chain is yours`)).toBeInTheDocument();
  });

  it('blocks a paid name when the balance does not cover it', async () => {
    mockCheckSponsorship.mockResolvedValue(sponsored(false));
    mockGetBalance.mockResolvedValue('1000'); // dust
    renderStep();
    await type(NAME);

    expect(await screen.findByText('Not enough AE. Your balance is 0.0000 AE.'))
      .toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buy for ≈ 0.0215 AE' })).toBeDisabled();
  });

  it('shows claim errors the way the profile editor does', async () => {
    mockClaim.claimSponsoredChainName.mockRejectedValue(new Error('User rejected the request'));
    renderStep();
    await type(NAME);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Claim for free' }));
    });

    expect(await screen.findByRole('alert'))
      .toHaveTextContent('You declined the request in your wallet. Please try again.');
    expect(mockNotifications.notifyError).toHaveBeenCalled();
    // Back on the form, so the user can retry or skip.
    expect(screen.getByRole('button', { name: 'Claim for free' })).toBeEnabled();
  });

  it('lets the user skip with Later', () => {
    const { onDone } = renderStep();
    fireEvent.click(screen.getByRole('button', { name: 'Later' }));
    expect(onDone).toHaveBeenCalledWith('skipped');
    expect(mockClaim.claimSponsoredChainName).not.toHaveBeenCalled();
  });
});
