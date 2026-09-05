// Shared trailing parts for the token/mention display pill, so the token pill,
// the rung-0/1 hashtag pill and the composer's rung previews render one badge,
// not three that drift apart.

export interface PillChangeBadgeProps {
  changePercent: number;
}

// Flat is keyed on what the badge renders (1dp), not on exact zero: the badge prints
// `.toFixed(1)`, so anything under 0.05% rounds to `0.0%` and a `0.0%` reading must not
// point anywhere. Exported so the badge and the spoken labels share one notion of flat.
export const isFlatChange = (changePercent: number) => Math.abs(changePercent) < 0.05;

/**
 * The 24h change badge. Direction is carried by an arrow, never by hue alone, so
 * it survives greyscale and red/green colour-blindness. Always aria-hidden — the
 * change is spoken once in the pill's single label. When flat it is neutral ink
 * with no arrow: a value that renders as 0.0% has no direction to point.
 */
export const PillChangeBadge = ({ changePercent }: PillChangeBadgeProps) => {
  const flat = isFlatChange(changePercent);
  const positive = changePercent > 0;
  let variant = 'flat';
  if (!flat) variant = positive ? 'up' : 'down';
  return (
    <span
      className={`sh-pill__chg sh-pill__chg--${variant}`}
      aria-hidden="true"
    >
      {!flat && <span className="sh-pill__chg-arrow">{positive ? '▲' : '▼'}</span>}
      <span>{`${Math.abs(changePercent).toFixed(1)}%`}</span>
    </span>
  );
};

export default PillChangeBadge;
