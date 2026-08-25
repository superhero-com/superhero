import { useChainName } from '@/hooks/useChainName';
import { formatAddress } from '@/utils/address';
import { MentionPill } from './PostMentionTag';

interface AccountMentionPillProps {
  address: string;
}

// A deliberate `[account:ak_…]` mention, rendered through the one shared mention pill: the
// account's `.chain` name when known, else the shortened address. No leading mark — the '@'
// sigil carries it, matching the token pill and the mobile client.
export const AccountMentionPill = ({ address }: AccountMentionPillProps) => {
  const { chainName } = useChainName(address);
  const label = chainName ?? formatAddress(address, 3, true);
  return (
    <MentionPill
      name={address}
      label={label}
      href={`/users/${address}`}
    />
  );
};

export default AccountMentionPill;
