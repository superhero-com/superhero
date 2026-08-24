// Shared trailing parts for the token/mention display pill, so the token pill,
// the rung-0/1 hashtag pill and the composer's rung previews render one badge,
// not three that drift apart.

export interface PillChangeBadgeProps {
  changePercent: number;
}

/**
 * The 24h change badge. Direction is carried by an arrow, never by hue alone, so
 * it survives greyscale and red/green colour-blindness. Always aria-hidden — the
 * change is spoken once in the pill's single label. At exactly zero it is neutral
 * ink with no arrow: a flat token has no direction to point.
 */
export const PillChangeBadge = ({ changePercent }: PillChangeBadgeProps) => {
  const flat = changePercent === 0;
  const positive = changePercent > 0;
  let variant = 'flat';
  if (!flat) variant = positive ? 'up' : 'down';
  return (
    <span
      className={`sh-pill__chg sh-pill__chg--${variant}`}
      aria-hidden="true"
    >
      {!flat && <span className="sh-pill__chg-arrow">{positive ? '▲' : '▼'}</span>}
      {`${Math.abs(changePercent).toFixed(1)}%`}
    </span>
  );
};

export default PillChangeBadge;
