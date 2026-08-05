import React from 'react';
import {
  render, screen, waitFor, fireEvent,
} from '@testing-library/react';
import { Provider, createStore, useAtomValue } from 'jotai';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

const mocks = vi.hoisted(() => ({
  activeAccount: 'ak_first' as string | undefined,
  signMessage: vi.fn(async () => 'deadbeef'),
  notifyError: vi.fn(),
  fetchNostrLink: vi.fn(),
}));

vi.mock('@/hooks/useAeSdk', () => ({
  useAeSdk: () => ({ activeAccount: mocks.activeAccount, signMessage: mocks.signMessage }),
}));

vi.mock('@/features/transaction-notification', () => ({
  useTransactionNotification: () => ({ notifyError: mocks.notifyError }),
}));

vi.mock('../link-flow', () => ({
  fetchNostrLink: (address: string) => mocks.fetchNostrLink(address),
  linkNostrIdentity: vi.fn(async () => ({ txHash: 'th_x' })),
}));

// eslint-disable-next-line import/first
import { useNostrLinkCheck } from '../useNostrLinkCheck';
// eslint-disable-next-line import/first
import { nostrLinkStatusAtom } from '../state';

const Harness = () => {
  const { dismiss } = useNostrLinkCheck();
  const status = useAtomValue(nostrLinkStatusAtom);
  return (
    <div>
      <div data-testid="status">{status}</div>
      <button type="button" data-testid="dismiss" onClick={dismiss}>dismiss</button>
    </div>
  );
};

beforeEach(() => {
  mocks.activeAccount = 'ak_first';
  mocks.fetchNostrLink.mockReset();
  // Default: first account already linked, everyone else unlinked.
  mocks.fetchNostrLink.mockImplementation(
    async (address: string) => (address === 'ak_first' ? 'npub-linked' : null),
  );
  localStorage.clear();
});

describe('useNostrLinkCheck — account switch', () => {
  it('rechecks the link and re-prompts when the active account changes', async () => {
    const store = createStore();
    const { rerender } = render(<Provider store={store}><Harness /></Provider>);

    // First account is linked.
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('linked'));
    expect(mocks.fetchNostrLink).toHaveBeenCalledWith('ak_first');

    // Switch to a second, unlinked account.
    mocks.activeAccount = 'ak_second';
    rerender(<Provider store={store}><Harness /></Provider>);

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('prompt'));
    expect(mocks.fetchNostrLink).toHaveBeenCalledWith('ak_second');
    expect(mocks.fetchNostrLink).toHaveBeenCalledTimes(2);
  });

  it('does not re-check when the same account re-renders', async () => {
    const store = createStore();
    const { rerender } = render(<Provider store={store}><Harness /></Provider>);
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('linked'));

    rerender(<Provider store={store}><Harness /></Provider>);
    rerender(<Provider store={store}><Harness /></Provider>);

    expect(mocks.fetchNostrLink).toHaveBeenCalledTimes(1);
  });

  it('a dismissal on one account does not suppress the prompt on another', async () => {
    // Both accounts unlinked, so only the per-account dismissal cooldown decides
    // whether the prompt shows.
    mocks.fetchNostrLink.mockImplementation(async () => null);

    const store = createStore();
    const { rerender } = render(<Provider store={store}><Harness /></Provider>);

    // Account A: unlinked, not dismissed → prompt. Dismiss it → done.
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('prompt'));
    fireEvent.click(screen.getByTestId('dismiss'));
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('done'));

    // Switch to account B: also unlinked, never dismissed → must still prompt.
    mocks.activeAccount = 'ak_second';
    rerender(<Provider store={store}><Harness /></Provider>);
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('prompt'));
  });
});
