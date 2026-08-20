import { Link } from 'react-router-dom';
import AddressAvatar from '@/components/AddressAvatar';
import { useChainName } from '@/hooks/useChainName';
import { formatAddress } from '@/utils/address';

interface InlineAccountMentionProps {
  /** The tagged account address (`ak_...`). */
  address: string;
}

/**
 * Inline rendering of an `@ak_...` account mention inside post content: a small
 * avatar chip that resolves to the account's `.chain` name when known and falls
 * back to the shortened address otherwise (so a mention of an account with no
 * chain name still renders with its identicon).
 */
export const InlineAccountMention = ({ address }: InlineAccountMentionProps) => {
  const { chainName } = useChainName(address);
  const label = chainName ? `@${chainName}` : `@${formatAddress(address, 3, true)}`;

  return (
    <Link
      to={`/users/${address}`}
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1 align-middle px-1.5 py-0.5 -my-0.5 rounded-full bg-white/10 border border-white/15 text-[var(--neon-teal)] text-[13px] font-medium no-underline hover:bg-white/15 hover:border-white/25 break-words"
      title={address}
    >
      <AddressAvatar address={address} size={16} />
      <span className="leading-none">{label}</span>
    </Link>
  );
};

export default InlineAccountMention;
