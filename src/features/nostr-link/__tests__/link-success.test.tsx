import React from 'react';
import {
  render, screen, waitFor, fireEvent,
} from '@testing-library/react';
import { Provider, createStore, useAtomValue } from 'jotai';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

const mocks = vi.hoisted(() => ({
  signMessage: vi.fn(async () => 'deadbeef'),
  notifyError: vi.fn(),
  fetchNostrLink: vi.fn<(address: string) => Promise<string | null>>(),
}));

vi.mock('@/hooks/useAeSdk', () => ({
  useAeSdk: () => ({ activeAccount: 'ak_me', signMessage: mocks.signMessage }),
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
import { useRequestNostrLinkPrompt } from '../useRequestNostrLinkPrompt';
// eslint-disable-next-line import/first
import { nostrLinkStatusAtom } from '../state';

const deriveIdentity = vi.fn(async () => ({
  npub: 'npub1new',
  identity: {} as never,
}));

const PromptRequester = () => {
  useRequestNostrLinkPrompt();
  return null;
};

const Harness = ({ requestPrompt = false }: { requestPrompt?: boolean }) => {
  const { linkNostr } = useNostrLinkCheck(deriveIdentity);
  const status = useAtomValue(nostrLinkStatusAtom);
  return (
    <div>
      <div data-testid="status">{status}</div>
      <button type="button" data-testid="link" onClick={() => { linkNostr(); }}>link</button>
      {requestPrompt && <PromptRequester />}
    </div>
  );
};

beforeEach(() => {
  mocks.fetchNostrLink.mockReset();
  mocks.fetchNostrLink.mockResolvedValue(null);
  localStorage.clear();
});

describe('useNostrLinkCheck — a completed link', () => {
  it('resolves to `linked`, not the dismissible `done`', async () => {
    render(<Provider store={createStore()}><Harness /></Provider>);
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('prompt'));

    fireEvent.click(screen.getByTestId('link'));

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('linked'));
  });

  it('is not re-prompted on a screen that requires linking', async () => {
    const store = createStore();
    const { rerender } = render(<Provider store={store}><Harness /></Provider>);
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('prompt'));

    fireEvent.click(screen.getByTestId('link'));
    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('linked'));

    // Entering a chat screen right after linking — while the link tx may still
    // be settling — must not raise the "Enable Chat" dialog again.
    rerender(<Provider store={store}><Harness requestPrompt /></Provider>);

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('linked'));
  });
});
