import { Link } from 'react-router-dom';
import AddressAvatar from '@/components/AddressAvatar';
import { useChainName } from '@/hooks/useChainName';
import { formatAddress } from '@/utils/address';

interface InlineAccountMentionProps {
  address: string;
}

// Avatar chip for an `@ak_...` mention. With a resolved `.chain` name it mirrors
// the header user-search row — avatar + chain name + muted address — so the badge
// reads the same in the composer picker and once rendered in a post. Without a
// name it falls back to avatar + shortened address, unchanged (identicon renders
// either way).
export const InlineAccountMention = ({ address }: InlineAccountMentionProps) => {
  const { chainName } = useChainName(address);
  const name = chainName?.trim();

  return (
    <Link
      to={`/users/${address}`}
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1 align-middle px-1.5 py-0.5 -my-0.5 rounded-full bg-white/10 border border-white/15 text-[var(--neon-teal)] text-[13px] font-medium no-underline hover:bg-white/15 hover:border-white/25 break-words"
      title={address}
    >
      <AddressAvatar address={address} size={16} />
      <span className="leading-none">{name ? `@${name}` : `@${formatAddress(address, 3, true)}`}</span>
      {name && (
        <span className="leading-none text-[11px] font-mono text-white/50">
          {formatAddress(address, 4, true)}
        </span>
      )}
    </Link>
  );
};

export default InlineAccountMention;
