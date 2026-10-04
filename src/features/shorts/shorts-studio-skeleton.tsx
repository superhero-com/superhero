const Placeholder = ({ shape = 'line' }: { shape?: 'line' | 'label' | 'value' | 'button' | 'thumbnail' | 'chart' }) => (
  <span className={`ss-skeleton ss-skeleton--${shape}`} />
);

const RewardsSkeleton = () => (
  <div className="ss-rewards ss-skeleton-rewards">
    <div className="ss-skeleton-copy">
      <Placeholder shape="label" />
      <Placeholder shape="value" />
      <Placeholder />
    </div>
    <Placeholder shape="button" />
  </div>
);

const MetricsSkeleton = () => (
  <div className="ss-metrics">
    {['views', 'reach', 'watch', 'rewards'].map((metric) => (
      <div className="ss-metric" key={metric}>
        <Placeholder shape="label" />
        <Placeholder shape="value" />
        <Placeholder />
      </div>
    ))}
  </div>
);

const AnalyticsSkeleton = () => (
  <>
    <div className="ss-period">
      <div className="ss-skeleton-copy">
        <Placeholder shape="label" />
        <Placeholder />
      </div>
      <Placeholder shape="button" />
    </div>
    <MetricsSkeleton />
    <div className="ss-skeleton-note">
      <Placeholder />
      <Placeholder />
    </div>
    <div className="ss-panel">
      <div className="ss-skeleton-heading">
        <div className="ss-skeleton-copy">
          <Placeholder shape="label" />
          <Placeholder />
        </div>
        <Placeholder shape="button" />
      </div>
      <Placeholder shape="chart" />
      <div className="ss-skeleton-heading">
        <Placeholder shape="label" />
        <Placeholder shape="label" />
      </div>
    </div>
    <div className="ss-two-col">
      {['retention', 'discovery'].map((panel) => (
        <div className="ss-panel ss-skeleton-copy" key={panel}>
          <Placeholder shape="label" />
          <Placeholder shape="value" />
          <Placeholder />
          <Placeholder />
          <Placeholder />
          <Placeholder />
        </div>
      ))}
    </div>
  </>
);

const ListSkeleton = ({ thumbnails = false }: { thumbnails?: boolean }) => (
  <div className="ss-panel">
    <div className="ss-skeleton-heading">
      <div className="ss-skeleton-copy">
        <Placeholder shape="label" />
        <Placeholder />
      </div>
      <Placeholder shape="button" />
    </div>
    {['first', 'second', 'third'].map((row) => (
      <div className="ss-skeleton-row" key={row}>
        {thumbnails && <Placeholder shape="thumbnail" />}
        <div className="ss-skeleton-copy">
          <Placeholder />
          <Placeholder shape="label" />
        </div>
        <Placeholder shape="label" />
        <Placeholder shape="label" />
      </div>
    ))}
  </div>
);

export const StudioSkeleton = ({ page = 'overview', label = 'Loading your Studio…' }: { page?: string; label?: string }) => (
  <div className="ss-loading" role="status">
    <span className="ss-loading-label">{label}</span>
    <div aria-hidden="true">
      {(page === 'overview' || page === 'revenue') && <RewardsSkeleton />}
      {(page === 'overview' || page === 'analytics') && <AnalyticsSkeleton />}
      {page === 'revenue' && <MetricsSkeleton />}
      {page === 'video' && (
        <div className="ss-panel ss-skeleton-copy">
          <Placeholder shape="label" />
          <Placeholder shape="value" />
          <Placeholder />
          <Placeholder shape="chart" />
        </div>
      )}
      {page !== 'analytics' && <ListSkeleton thumbnails={page === 'overview' || page === 'content'} />}
      {page === 'hosting' && <ListSkeleton />}
    </div>
  </div>
);
