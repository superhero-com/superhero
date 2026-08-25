import AddressAvatar from '@/components/AddressAvatar';
import { useChainName } from '@/hooks/useChainName';
import { formatAddress } from '@/utils/address';
import { MentionPill } from './PostMentionTag';

interface AccountMentionPillProps {
  address: string;
}

// A deliberate `[account:ak_…]` mention, rendered through the one shared mention pill: the
// account's identicon as the pill's mark, and its `.chain` name when known (else the shortened
// address). The name resolution and identicon that used to live in a bespoke chip now sit
// inside the approved pill, so token and mention are one component in the post card.
export const AccountMentionPill = ({ address }: AccountMentionPillProps) => {
  const { chainName } = useChainName(address);
  const label = chainName ?? formatAddress(address, 3, true);
  return (
    <MentionPill
      name={address}
      label={label}
      href={`/users/${address}`}
      mark={<AddressAvatar address={address} size="100%" />}
    />
  );
};

export default AccountMentionPill;
