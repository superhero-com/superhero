import { fireEvent, render, screen } from '@testing-library/react';
import { AeSdk, Node, type AccountBase } from '@aeternity/aepp-sdk';
import { MemoryRouter } from 'react-router-dom';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import CollectInvitationLinkCard from '../CollectInvitationLinkCard';

const mockUserAddress = 'ak_241gerYcVAvfk7Vc6gFuqBje5CfVJxT1fgzkym5cq2qtfxfKgD';
const mockInvitationAddress = 'ak_yusDHyWLdAY5eo5okvwqumrmZ2McYwsbFzVV8vpQBU2sfhUur';
const INVITER_ADDRESS = 'ak_2oW9WdR2qUZPGHhWQSVsetbMoo2qGSnvo2QhSZEeqGGtBLwMeH';
const mockInvitationCode = 'sk_invitation';
// The card looks the invitation up on mount through its own sdk, which selects this node by name.
const mockNetwork = { name: 'ae_mainnet' };
const mockNodes = [{ name: mockNetwork.name, instance: new Node('https://node.invalid') }];
let mockStaticAeSdk: AeSdk;
const mockTreasury = {
  getInvitationCode: vi.fn(),
  redeemInvitationCode: vi.fn(),
};
const mockGetAffiliationTreasury = vi.fn();
const mockResetInviteCode = vi.fn();

// Deriving an address from a secret key can't run under jsdom: the `buffer` polyfill's `Buffer`
// is not `instanceof` jsdom's `Uint8Array`, so tweetnacl rejects it (see
// derivation.goldenvector.test.ts). The card only needs the invitation account's address.
vi.mock('@aeternity/aepp-sdk', async () => {
  const actual = await vi.importActual<any>('@aeternity/aepp-sdk');
  return {
    ...actual,
    MemoryAccount: class {
      address = mockInvitationAddress;
    },
  };
});

vi.mock('@/hooks/useAeSdk', () => ({
  useAeSdk: () => ({
    sdk: mockStaticAeSdk,
    staticAeSdk: mockStaticAeSdk,
    activeAccount: mockUserAddress,
    activeNetwork: mockNetwork,
    nodes: mockNodes,
  }),
}));

vi.mock('@/hooks/useCommunityFactory', () => ({
  useCommunityFactory: () => ({ getAffiliationTreasury: mockGetAffiliationTreasury }),
}));

vi.mock('@/hooks/useInvitation', () => ({
  useInvitation: () => ({
    invitationCode: mockInvitationCode,
    resetInviteCode: mockResetInviteCode,
  }),
}));

vi.mock('@/features/shared/components/LivePriceFormatter', () => ({
  default: () => <span data-testid="live-price" />,
}));

vi.mock('@/@components/Address/AddressAvatarWithChainName', () => ({
  AddressAvatarWithChainName: () => null,
}));

vi.mock('@/components/ConnectWalletButton', () => ({
  ConnectWalletButton: () => null,
}));

describe('CollectInvitationLinkCard', () => {
  beforeEach(() => {
    // Shaped like the delegated signer the app installs on the static sdk.
    const userSigner = { address: mockUserAddress } as unknown as AccountBase;
    mockStaticAeSdk = new AeSdk({ accounts: [userSigner] });
    mockTreasury.getInvitationCode.mockResolvedValue([INVITER_ADDRESS, 10n ** 18n, false]);
    mockTreasury.redeemInvitationCode.mockResolvedValue(undefined);
    mockGetAffiliationTreasury.mockResolvedValue(mockTreasury);
  });

  it('redeems the invitation for the active account without taking over its signer', async () => {
    render(
      <MemoryRouter>
        <CollectInvitationLinkCard />
      </MemoryRouter>,
    );

    await screen.findByText(/has invited you to join/);
    fireEvent.click(screen.getByRole('button', { name: 'Claim Reward' }));

    expect(await screen.findByText('Invitation reward has been claimed successfully!'))
      .toBeInTheDocument();
    expect(mockTreasury.redeemInvitationCode)
      .toHaveBeenCalledWith(mockInvitationCode, mockUserAddress);
    // Without a wallet, the static sdk signs the user's later transactions.
    expect(mockStaticAeSdk.selectedAddress).toBe(mockUserAddress);
  });
});
