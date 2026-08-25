import EntityPill from './EntityPill';

export interface MentionPillProps {
  name: string; // handle without the leading '@' (e.g. "marco", "marco.chain")
  href: string; // profile target, matching today's mention links (/users/...)
  label?: string; // display text when it differs from name (e.g. a formatted ak_ address)
  unresolvable?: boolean; // → plain text, no pill, no link, same as an unknown token
}

// A mention rendered as the same pill a token uses, distinguished only by the '@' sigil; an
// unresolvable handle degrades to plain text. No leading mark — the mark was the only thing the
// former `loading` state shimmered, and the handle text is known synchronously, so both the mark
// and the loading skeleton are gone with it.
export const MentionPill = ({
  name, href, label, unresolvable = false,
}: MentionPillProps) => {
  const display = label ?? name;
  if (unresolvable) {
    return <EntityPill plain sigil="@" label={display} ariaLabel={`${display} — unresolved mention`} />;
  }
  return (
    <EntityPill
      sigil="@"
      label={display}
      href={href}
      ariaLabel={`${display}, mention — link`}
    />
  );
};

export default MentionPill;
