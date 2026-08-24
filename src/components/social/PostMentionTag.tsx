import EntityPill from './EntityPill';

export interface MentionPillProps {
  name: string; // handle without the leading '@' (e.g. "marco", "marco.chain")
  href: string; // profile target, matching today's mention links (/users/...)
  label?: string; // display text when it differs from name (e.g. a formatted ak_ address)
  loading?: boolean; // avatar still resolving — shimmer mark; live use resolves immediately
  unresolvable?: boolean; // → plain text, no pill, no link, same as an unknown token
}

// A mention rendered as the same pill a token uses, differing only by a circular mark and the
// '@' sigil; an unresolvable handle degrades to plain text.
export const MentionPill = ({
  name, href, label, loading = false, unresolvable = false,
}: MentionPillProps) => {
  const display = label ?? name;
  if (unresolvable) {
    return <EntityPill plain sigil="@" label={display} markShape="circle" ariaLabel={`${display} — unresolved mention`} />;
  }
  return (
    <EntityPill
      sigil="@"
      label={display}
      markShape="circle"
      href={href}
      ariaLabel={`${display}, mention — link`}
      mark={loading ? <span className="sh-pill__skel" style={{ width: '100%', height: '100%' }} /> : name.slice(0, 1)}
    />
  );
};

export default MentionPill;
