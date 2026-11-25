import { render, screen, waitFor } from '@testing-library/react';
import {
  afterEach, expect, it, vi,
} from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { encode, Encoding } from '@aeternity/aepp-sdk';
import { formatAddress } from '@/utils/address';
import { ShortsCreator } from '../shorts-creator';
import { ShortsCommentTime } from '../shorts-comment-time';

const names = vi.hoisted(() => ({ chainName: '' }));
vi.mock('@/hooks/useChainName', () => ({ useChainName: () => names }));
vi.mock('@/api/generated', () => ({ AccountsService: { getAccount: async () => ({}) } }));
vi.mock('@/components/AddressAvatar', () => ({ default: () => <span /> }));
vi.mock('@/config', () => ({ CONFIG: { NODE_URL: 'https://node.example' } }));
vi.mock('@/features/social/components/ProfileIdentity', () => ({ default: ({ address }: { address: string }) => <div data-testid="full-profile">{address}</div> }));

const address = encode(new Uint8Array(32).fill(5), Encoding.AccountAddress);
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter>{children}</MemoryRouter>
  </QueryClientProvider>
);
afterEach(() => { names.chainName = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('shows only a short address in comments and preserves the full profile identity elsewhere', () => {
  const view = render(<ShortsCreator address={address} compact />, { wrapper });
  expect(screen.getByText(formatAddress(address, 6))).toHaveAttribute('href', `/users/${address}`);
  expect(screen.queryByText(address)).toBeNull();
  view.rerender(<ShortsCreator address={address} />);
  expect(screen.getByTestId('full-profile')).toHaveTextContent(address);
});

it('prefers the chain name with no duplicate address badge in comments', () => {
  names.chainName = 'creator.chain';
  render(<ShortsCreator address={address} compact />, { wrapper });
  expect(screen.getByText('creator.chain')).toBeInTheDocument();
  expect(screen.queryByText(formatAddress(address, 6))).toBeNull();
  expect(screen.queryByTestId('full-profile')).toBeNull();
});

it('renders human time from the actual block timestamp and shares same-height requests', async () => {
  const now = Date.now();
  vi.spyOn(Date, 'now').mockReturnValue(now);
  const fetchBlock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ height: 42, time: now - 120_000 })));
  vi.stubGlobal('fetch', fetchBlock);
  render(
    <>
      <ShortsCommentTime height="42" />
      <ShortsCommentTime height="42" />
    </>,
    { wrapper },
  );
  await waitFor(() => expect(screen.getAllByText('2 minutes ago')).toHaveLength(2));
  expect(screen.getAllByText('2 minutes ago')[0]).toHaveAttribute('datetime', new Date(now - 120_000).toISOString());
  expect(fetchBlock).toHaveBeenCalledOnce();
  expect(fetchBlock.mock.calls[0][0]).toBe('https://node.example/v3/key-blocks/height/42');
});

it('does not invent a posting time for an invalid height', () => {
  const fetchBlock = vi.fn(); vi.stubGlobal('fetch', fetchBlock);
  const view = render(<ShortsCommentTime height="9007199254740993" />, { wrapper });
  expect(view.container.querySelector('time')).toBeNull();
  expect(fetchBlock).not.toHaveBeenCalled();
});
