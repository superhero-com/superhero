import EntityPill from './EntityPill';

export interface MentionPillProps {
  /** The handle as written, without the leading '@' (e.g. "marco", "marco.chain"). */
  name: string;
  /** Profile target — matches today's mention links (`/users/...`). */
  href: string;
  /** Display text if it differs from `name` (e.g. a formatted `ak_` address). */
  label?: string;
  /** Avatar still resolving — shows a shimmer mark. Live use resolves immediately. */
  loading?: boolean;
  /** Unresolvable handle → plain text, no pill, no link. Same rule as an unknown token. */
  unresolvable?: boolean;
}

/**
 * A mention rendered as the same pill a token uses — same height, radius, wash,
 * border, press state and hit target — differing only by a circular mark and the
 * '@' sigil, so a post carrying a mention and a token reads as one system rather
 * than two competing chips. An unresolvable handle degrades to plain text.
 */
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
