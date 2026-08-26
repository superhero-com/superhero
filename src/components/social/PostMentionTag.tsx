import React from 'react';
import EntityPill from './EntityPill';

export interface MentionPillProps {
  name: string; // handle without the leading '@' (e.g. "marco", "marco.chain")
  href: string; // profile target, matching today's mention links (/users/...)
  label?: string; // display text when it differs from name (e.g. a formatted ak_ address)
  unresolvable?: boolean; // → plain text, no pill, no link, same as an unknown token
  // Only a deliberate `[account:…]` mention passes these: its identicon and the muted
  // trailing address. A bare handle/AENS mention passes neither and stays text-only.
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  ariaLabel?: string; // override the default spoken label (account folds in the address)
}

// A mention rendered as the same pill a token uses, distinguished by the '@' sigil; an
// unresolvable handle degrades to plain text. Only an account mention carries a leading
// identicon and a trailing address — a bare handle is the handle text alone.
export const MentionPill = ({
  name, href, label, unresolvable = false, leading, trailing, ariaLabel,
}: MentionPillProps) => {
  const display = label ?? name;
  if (unresolvable) {
    return <EntityPill plain sigil="@" label={display} ariaLabel={ariaLabel ?? `${display} — unresolved mention`} />;
  }
  return (
    <EntityPill
      sigil="@"
      label={display}
      href={href}
      leading={leading}
      trailing={trailing}
      ariaLabel={ariaLabel ?? `${display}, mention — link`}
    />
  );
};

export default MentionPill;
