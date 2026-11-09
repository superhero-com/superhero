import React from 'react';
import {
  act, fireEvent, render, screen,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { createStore, Provider } from 'jotai';
import { AccountsService } from '@/api/generated/services/AccountsService';
import { chainNamesAtom } from '@/atoms/walletAtoms';
import { CHAIN_NAME_STEP_DISMISSED_KEY_PREFIX } from '@/components/onboarding/chainNameStepGate';
import OnboardingModal from '../OnboardingModal';

const ADDRESS = 'ak_gAWT7XdGs2wtyCMPJe1K1SneofRFeDGf6Sp5ueftdev36XwHH';

// The passkey card stands in for every way in: it reports a connected wallet.
vi.mock('@/components/PasskeyConnectCard', () => ({
  default: ({ onConnected }: { onConnected: (address: string) => void }) => (
    <button type="button" onClick={() => onConnected(ADDRESS)}>Use test wallet</button>
  ),
}));
vi.mock('@/components/AgentOnboardCard', () => ({ default: () => null }));
vi.mock('@/components/MobileAppInstall', () => ({ MobileAppCard: () => null }));
vi.mock('@/hooks', () => ({
  useAeSdk: () => ({ activeAccount: null, addStaticAccount: vi.fn() }),
  useWalletConnect: () => ({ connectWallet: vi.fn(), connectingWallet: false }),
}));
// The step itself is covered in ChainNameStep.test.tsx.
vi.mock('@/components/onboarding/ChainNameStep', () => ({
  default: ({ onDone }: { onDone: (result: string) => void }) => (
    <div>
      <h2>Pick your .chain name</h2>
      <button type="button" onClick={() => onDone('skipped')}>Later</button>
      <button type="button" onClick={() => onDone('claimed')}>Claimed</button>
    </div>
  ),
}));

function renderModal(store = createStore()) {
  const onClose = vi.fn();
  const onConnected = vi.fn();
  const view = render(
    <MemoryRouter>
      <Provider store={store}>
        <OnboardingModal onClose={onClose} onConnected={onConnected} />
      </Provider>
    </MemoryRouter>,
  );
  return {
    onClose, onConnected, store, ...view,
  };
}

async function connect() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Use test wallet' }));
  });
}

describe('onboarding .chain name step', () => {
  let lookup: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    window.localStorage.clear();
    lookup = vi.spyOn(AccountsService, 'getChainNamesForAddresses')
      .mockResolvedValue({ [ADDRESS]: null } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it('offers the step to a new wallet with no name, before closing', async () => {
    const { onClose, onConnected } = renderModal();
    await connect();

    expect(await screen.findByRole('heading', { name: 'Pick your .chain name' })).toBeInTheDocument();
    expect(lookup).toHaveBeenCalledWith({ addresses: ADDRESS });
    expect(onClose).not.toHaveBeenCalled();
    expect(onConnected).not.toHaveBeenCalled();
  });

  it('finishes onboarding on Later and does not ask again', async () => {
    const first = renderModal();
    await connect();
    fireEvent.click(await screen.findByRole('button', { name: 'Later' }));

    expect(first.onClose).toHaveBeenCalledTimes(1);
    expect(first.onConnected).toHaveBeenCalledWith(ADDRESS);
    expect(window.localStorage.getItem(`${CHAIN_NAME_STEP_DISMISSED_KEY_PREFIX}${ADDRESS}`)).toBe('1');
    first.unmount();

    const second = renderModal();
    await connect();
    expect(second.onConnected).toHaveBeenCalledWith(ADDRESS);
    expect(screen.queryByRole('heading', { name: 'Pick your .chain name' })).not.toBeInTheDocument();
  });

  it('finishes onboarding after a claim', async () => {
    const { onClose, onConnected } = renderModal();
    await connect();
    fireEvent.click(await screen.findByRole('button', { name: 'Claimed' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConnected).toHaveBeenCalledWith(ADDRESS);
    // A claim is not a skip: the account has a name now, nothing to remember.
    expect(window.localStorage.getItem(`${CHAIN_NAME_STEP_DISMISSED_KEY_PREFIX}${ADDRESS}`)).toBeNull();
  });

  it('skips the step for a wallet that already owns a name', async () => {
    lookup.mockResolvedValue({ [ADDRESS]: 'alreadyowned1234.chain' } as any);
    const { onClose, onConnected } = renderModal();
    await connect();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConnected).toHaveBeenCalledWith(ADDRESS);
    expect(screen.queryByRole('heading', { name: 'Pick your .chain name' })).not.toBeInTheDocument();
  });

  it('skips the lookup when the name is already known here', async () => {
    const store = createStore();
    store.set(chainNamesAtom, { [ADDRESS]: 'known12345678.chain' });
    const { onConnected } = renderModal(store);
    await connect();

    expect(onConnected).toHaveBeenCalledWith(ADDRESS);
    expect(lookup).not.toHaveBeenCalled();
  });

  it('never blocks onboarding when the lookup fails', async () => {
    lookup.mockRejectedValue(new Error('offline'));
    const { onConnected } = renderModal();
    await connect();

    expect(onConnected).toHaveBeenCalledWith(ADDRESS);
    expect(screen.queryByRole('heading', { name: 'Pick your .chain name' })).not.toBeInTheDocument();
  });

  it('treats closing the modal on the step as Later', async () => {
    const { onConnected, unmount } = renderModal();
    await connect();
    await screen.findByRole('heading', { name: 'Pick your .chain name' });

    unmount();
    expect(onConnected).toHaveBeenCalledWith(ADDRESS);
    expect(window.localStorage.getItem(`${CHAIN_NAME_STEP_DISMISSED_KEY_PREFIX}${ADDRESS}`)).toBe('1');
  });
});
