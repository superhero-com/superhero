import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export type EntityMarkShape = 'square' | 'circle';

export interface EntityPillProps {
  // The one spoken label for the whole pill; every visible part is aria-hidden.
  ariaLabel: string;
  sigil: string; // '#' token, '@' mention
  label: string; // symbol/handle without sigil, pre-truncated
  markShape: EntityMarkShape;
  mark?: React.ReactNode; // monogram, avatar or skeleton
  trailing?: React.ReactNode; // price / change / chart, each already aria-hidden
  rich?: boolean; // has price/chart → eligible for block promotion on a narrow column
  to?: string; // token → in-app router link
  href?: string; // mention → plain anchor, matching today's mention links
  plain?: boolean; // unresolved: plain dashed text, no pill, no link
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}

// The shared inline pill for a token tag and a mention: one link, one hit target, one spoken
// label, height on the line box, never split across a wrap. Token and mention differ only by the
// mark's shape and the sigil.
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
    // A bare <span> is role=generic, which drops aria-label; the visible text is the name.
    return <span className="sh-pill-plain">{`${sigil}${label}`}</span>;
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
