import React from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface EntityPillProps {
  // The one spoken label for the whole pill; every visible part is aria-hidden.
  ariaLabel: string;
  sigil: string; // '#' token, '@' mention
  label: string; // symbol/handle without sigil, pre-truncated
  // Optional leading node — only an account mention passes it (its identicon). Token pills
  // pass nothing, so the monogram removal stands: this is not the old `mark`, it is the
  // account's visual identity, sized in em so it seats inside the line box.
  leading?: React.ReactNode;
  trailing?: React.ReactNode; // price / change / chart, each already aria-hidden
  rich?: boolean; // has price/chart → eligible for block promotion on a narrow column
  to?: string; // token → in-app router link
  href?: string; // mention → plain anchor, matching today's mention links
  plain?: boolean; // unresolved: plain dashed text, no pill, no link
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
}

// The shared inline pill for a token tag and a mention: one link, one hit target, one spoken
// label, height on the line box, never split across a wrap. The '#' / '@' sigil carries the
// token-vs-mention distinction; only an account mention adds a leading identicon.
const EntityPill = ({
  ariaLabel,
  sigil,
  label,
  leading,
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
      {leading}
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
