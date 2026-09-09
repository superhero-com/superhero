// @vitest-environment jsdom
//
// Start is the obvious thing to press after typing a name, so a name the list is
// already showing has to open the same conversation the row does. These pin that
// equivalence, and the two ways it must NOT guess: a prefix, and a name two
// accounts share.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

const navigate = vi.fn();
const record = vi.fn();
const fetchNostrLink = vi.fn();
const accountsQuery = {
  accounts: [] as unknown[],
  query: { isLoading: false, isFetching: false },
};

vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }));
vi.mock('@/features/nostr-link', () => ({ fetchNostrLink: (a: string) => fetchNostrLink(a) }));
vi.mock('../hooks/useRecentChats', () => ({ useRecentChats: () => ({ record }) }));
vi.mock('../hooks/useNostrLinkedAccounts', () => ({
  useNostrLinkedAccounts: () => accountsQuery,
}));
vi.mock('@/components/Identicon', () => ({ default: () => <span data-testid="identicon" /> }));

const { StartNewChatDialog } = await import('../components/StartNewChatDialog');

/** A pubkey that `normalizeNostrId` accepts: 64 hex characters. */
const PUBKEY_A = 'a'.repeat(64);
const PUBKEY_B = 'b'.repeat(64);
const ADDRESS_A = 'ak_21SBPc3yHP7bpQDvD1KMKzZZEgLtSXpDsK97LTjVwjiskra6Ka';
const ADDRESS_B = 'ak_11111111111111111111111111111111273Yts';

const account = (chainName: string | null, address: string, nostrAddress: string) => ({
  address, chainName, nostrAddress,
});

const open = () => render(<StartNewChatDialog open onOpenChange={() => {}} />);
const type = (text: string) => fireEvent.change(screen.getByLabelText(/chat target/i), {
  target: { value: text },
});
const start = () => fireEvent.click(screen.getByRole('button', { name: /start/i }));

describe('StartNewChatDialog — a typed name opens the row it matches', () => {
  beforeEach(() => {
    navigate.mockReset();
    record.mockReset();
    fetchNostrLink.mockReset();
    accountsQuery.accounts = [];
    accountsQuery.query = { isLoading: false, isFetching: false };
  });

  it('opens the conversation for a name typed in full', () => {
    accountsQuery.accounts = [account('alice.chain', ADDRESS_A, PUBKEY_A)];
    open();
    type('alice.chain');
    start();

    expect(navigate).toHaveBeenCalledWith(`/chat/dm/${PUBKEY_A}`);
    expect(record).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'dm', id: PUBKEY_A, seed: ADDRESS_A, label: 'alice.chain',
    }));
  });

  it('opens exactly what clicking the row opens', () => {
    accountsQuery.accounts = [account('alice.chain', ADDRESS_A, PUBKEY_A)];

    const first = open();
    fireEvent.click(screen.getByText('alice.chain'));
    const [clicked] = record.mock.calls;
    const clickedNav = navigate.mock.calls[0];

    first.unmount();
    navigate.mockReset();
    record.mockReset();
    open();
    type('alice.chain');
    start();

    expect(record.mock.calls[0]).toEqual(clicked);
    expect(navigate.mock.calls[0]).toEqual(clickedNav);
  });

  it('ignores case, since the row is matched not the keystrokes', () => {
    accountsQuery.accounts = [account('alice.chain', ADDRESS_A, PUBKEY_A)];
    open();
    type('  Alice.Chain  ');
    start();
    expect(navigate).toHaveBeenCalledWith(`/chat/dm/${PUBKEY_A}`);
  });

  it('refuses to guess from a prefix', () => {
    accountsQuery.accounts = [account('alice.chain', ADDRESS_A, PUBKEY_A)];
    open();
    type('alice');
    start();

    expect(navigate).not.toHaveBeenCalled();
    expect(screen.getByText(/no account found/i)).toBeInTheDocument();
  });

  it('refuses to guess when two accounts share the name', () => {
    accountsQuery.accounts = [
      account('alice.chain', ADDRESS_A, PUBKEY_A),
      account('alice.chain', ADDRESS_B, PUBKEY_B),
    ];
    open();
    type('alice.chain');
    start();

    expect(navigate).not.toHaveBeenCalled();
    expect(screen.getByText(/more than one account uses that name/i)).toBeInTheDocument();
  });

  it('does not report "no account" before this term has any results', () => {
    accountsQuery.accounts = [];
    accountsQuery.query = { isLoading: true, isFetching: true };
    open();
    type('alice.chain');

    expect(screen.getByRole('button', { name: /start/i })).toBeDisabled();
  });

  it('stays usable through a background refetch of results already shown', () => {
    // Window focus and stale-time expiry refetch with data on screen. Blocking
    // Start there would take the button away mid-reach, for nothing.
    accountsQuery.accounts = [account('alice.chain', ADDRESS_A, PUBKEY_A)];
    accountsQuery.query = { isLoading: false, isFetching: true };
    open();
    type('alice.chain');

    expect(screen.getByRole('button', { name: /start/i })).toBeEnabled();
    start();
    expect(navigate).toHaveBeenCalledWith(`/chat/dm/${PUBKEY_A}`);
  });

  it('still resolves a wallet address through its linked key', async () => {
    fetchNostrLink.mockResolvedValue(PUBKEY_B);
    open();
    type(ADDRESS_A);
    start();

    await screen.findByLabelText(/chat target/i);
    expect(fetchNostrLink).toHaveBeenCalledWith(ADDRESS_A);
  });
});
