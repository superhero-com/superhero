export const ShortsPlayerSkeleton = () => (
  <div className="sv-slide sv-feed-loading" role="status" aria-label="Loading Shorts">
    <span className="sv-loading-label">Loading Shorts…</span>
    <div className="sv-composition" aria-hidden="true">
      <div className="sv-frame sv-skeleton-frame">
        <div className="sv-skeleton-controls">
          <span className="sv-skeleton sv-skeleton-circle" />
          <div>
            <span className="sv-skeleton sv-skeleton-circle" />
            <span className="sv-skeleton sv-skeleton-circle" />
          </div>
        </div>
        <div className="sv-skeleton-caption">
          <div className="sv-skeleton-creator">
            <span className="sv-skeleton sv-skeleton-avatar" />
            <div>
              <span className="sv-skeleton sv-skeleton-name" />
              <span className="sv-skeleton sv-skeleton-address" />
            </div>
          </div>
          <span className="sv-skeleton sv-skeleton-title" />
          <span className="sv-skeleton sv-skeleton-subtitle" />
          <span className="sv-skeleton sv-skeleton-topic" />
        </div>
        <span className="sv-skeleton sv-skeleton-timeline" />
      </div>
      <div className="sv-actions sv-skeleton-actions">
        {['like', 'comments', 'save', 'share'].map((action, index) => (
          <div className="sv-action" key={action}>
            <span className="sv-skeleton sv-skeleton-action" />
            {index < 2 && <span className="sv-skeleton sv-skeleton-count" />}
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const ShortsVideoLoading = ({ buffering, preparing }: { buffering: boolean; preparing: boolean }) => {
  let label = buffering ? 'Buffering video…' : 'Loading video…';
  if (preparing) label = 'Preparing video…';
  return (
    <div className={`sv-loading ${buffering ? 'sv-loading--buffering' : 'sv-loading--initial'}`} role="status" aria-label={label}>
      <span className="sv-loading-label">{label}</span>
      <span className="sv-loading-indicator" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
    </div>
  );
};
