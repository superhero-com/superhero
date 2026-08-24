import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export type EntityMarkShape = 'square' | 'circle';

export interface EntityPillProps {
  /**
   * The single spoken label for the whole pill — e.g. "SUPERHERO, 0.004078 AE,
   * up 2.4 percent, 24-hour chart — link". Every visible part is aria-hidden so
   * a screen reader hears this once, not four fragments.
   */
  ariaLabel: string;
  /** '#' for a token, '@' for a mention. */
  sigil: string;
  /** The symbol or handle, without its sigil. Pre-truncated by the caller. */
  label: string;
  markShape: EntityMarkShape;
  /** Monogram letters, an avatar, or a skeleton — never spoken. */
  mark?: React.ReactNode;
  /** Price / change / chart nodes, each already aria-hidden. */
  trailing?: React.ReactNode;
  /**
   * Rich pills (a price and/or chart) are eligible to promote to a block on a
   * narrow content column. Rung 0/1 pills are not — they never overflow.
   */
  rich?: boolean;
  /** Internal router target (token → trends page). */
  to?: string;
  /** Plain anchor target (mention → profile), matching today's mention links. */
  href?: string;
  /**
   * Unresolved: an unknown/delisted token or an unresolvable handle. Plain
   * dashed text, no pill and no link — a dead affordance is worse than none.
   */
  plain?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}

/**
 * The shared inline pill for a token tag and a mention. One link, one hit
 * target, one spoken label; height follows the line box and it never splits
 * across a wrap. Token and mention differ only by the mark's shape and the
 * sigil — everything else (height, radius, wash, border, press, target) is
 * identical, so a post carrying both reads as one system.
 */
const EntityPill = ({
  ariaLabel,
  sigil,
  label,
  markShape,
  mark,
  trailing,
  rich = false,
  to,
  href,
  plain = false,
  onClick,
  className = '',
}: EntityPillProps) => {
  if (plain) {
    return (
      <span className="sh-pill-plain" aria-label={ariaLabel}>
        {`${sigil}${label}`}
      </span>
    );
  }

  const inner = (
    <>
      <span
        className={cn('sh-pill__mark', markShape === 'circle' && 'sh-pill__mark--circle')}
        aria-hidden="true"
      >
        {mark ?? label.slice(0, 1)}
      </span>
      <span className="sh-pill__symbol" aria-hidden="true">
        {`${sigil}${label}`}
      </span>
      {trailing}
    </>
  );

  const classes = cn('sh-pill', rich && 'sh-pill--rich', className);
  const stop = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(e);
  };

  // Token → in-app router link; mention → plain anchor, matching today's
  // mention behaviour (a full navigation to the profile route).
  if (href) {
    return (
      <a href={href} aria-label={ariaLabel} className={classes} onClick={stop}>
        {inner}
      </a>
    );
  }
  return (
    <Link to={to ?? '#'} aria-label={ariaLabel} className={classes} onClick={stop}>
      {inner}
    </Link>
  );
};

export default EntityPill;
