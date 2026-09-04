import { useMemo } from 'react';
import * as jdenticon from 'jdenticon';
import { JDENTICON_CONFIG } from '@/components/AddressAvatar';
import { useChainName } from '@/hooks/useChainName';
import { formatAddress } from '@/utils/address';
import { trustedHtml } from '@/utils/trustedTypes';
import { MentionPill } from './PostMentionTag';

interface AccountMentionPillProps {
  address: string;
}

// A deliberate `[account:ak_…]` mention, rendered through the one shared mention pill and
// carrying the account's identity the way the header user-search row does: the identicon,
// the `.chain` name when known, and the muted address beside it. With no name it falls back
// to the identicon plus the shortened address — unchanged from before, no trailing duplicate.
export const AccountMentionPill = ({ address }: AccountMentionPillProps) => {
  const { chainName } = useChainName(address);
  const name = chainName?.trim();
  const shortAddress = formatAddress(address, 4, true);

  // The identicon IS the account's visual identity (not a monogram), so it stays. It is sized
  // in em by `.sh-pill__avatar`; a viewBox'd jdenticon SVG scales to fill that box.
  const avatar = useMemo(() => {
    const svg = trustedHtml(jdenticon.toSvg(address, 100, JDENTICON_CONFIG));
    return (
      <span
        className="sh-pill__avatar"
        aria-hidden="true"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }, [address]);

  // Name resolved → `@name` with the address trailing, muted and aria-hidden. No name → the
  // shortened address is the label itself, so there is no trailing part to duplicate it.
  const label = name ?? formatAddress(address, 3, true);
  const trailing = name
    ? <span className="sh-pill__addr" aria-hidden="true">{shortAddress}</span>
    : undefined;
  const ariaLabel = name
    ? `${name}, ${shortAddress}, mention — link`
    : `${label}, mention — link`;

  return (
    <MentionPill
      name={address}
      label={label}
      href={`/users/${address}`}
      leading={avatar}
      trailing={trailing}
      ariaLabel={ariaLabel}
    />
  );
};

export default AccountMentionPill;
