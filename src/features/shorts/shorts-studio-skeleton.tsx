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

const MetricsSkeleton = ({ chart = false }: { chart?: boolean }) => (
  <div className={chart ? 'ss-metric-tabs' : 'ss-metrics ss-metrics-strip'}>
    {['views', 'reach', 'watch', 'rewards'].map((metric) => (
      <div className="ss-metric" key={metric}>
        <Placeholder shape="label" />
        <Placeholder shape="value" />
        <Placeholder />
      </div>
    ))}
  </div>
);

const AnalyticsSkeleton = ({ compact = false }: { compact?: boolean }) => (
  <>
    <div className="ss-analytics-toolbar">
      <Placeholder shape="label" />
      <Placeholder shape="button" />
    </div>
    {compact ? <MetricsSkeleton /> : (
      <>
        <div className="ss-panel ss-performance-panel">
          <MetricsSkeleton chart />
          <div className="ss-performance-body"><Placeholder shape="chart" /></div>
        </div>
        <div className="ss-two-col ss-analytics-cards">
          {['discovery', 'engagement'].map((panel) => (
            <div className="ss-panel ss-skeleton-copy" key={panel}>
              <Placeholder shape="label" />
              <Placeholder />
              <Placeholder />
              <Placeholder />
            </div>
          ))}
        </div>
      </>
    )}
    <div className="ss-skeleton-note"><Placeholder shape="label" /></div>
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
      {page === 'revenue' && <RewardsSkeleton />}
      {['overview', 'analytics', 'summary'].includes(page) && <AnalyticsSkeleton compact={page !== 'analytics'} />}
      {page === 'overview' && (
      <div className="ss-overview-grid">
        <ListSkeleton thumbnails />
        <RewardsSkeleton />
      </div>
      )}
      {page === 'revenue' && <MetricsSkeleton />}
      {page === 'video' && (
        <div className="ss-panel ss-skeleton-copy">
          <Placeholder shape="label" />
          <Placeholder shape="value" />
          <Placeholder />
          <Placeholder shape="chart" />
        </div>
      )}
      {!['analytics', 'overview', 'summary'].includes(page) && <ListSkeleton thumbnails={page === 'content'} />}
    </div>
  </div>
);
