import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Clapperboard } from 'lucide-react';
import './shorts-studio-analytics.css';
import { shortsMediaUrl } from './shorts-media';
import { StudioSkeleton } from './shorts-studio-skeleton';
import { dailyCreatorRevenue } from './shorts-trends';
import type { Performance } from './types';
import type { useShorts } from './use-shorts';

type State = ReturnType<typeof useShorts>;
type Measure = 'views' | 'reach' | 'watchSeconds' | 'averageSeconds' | 'completion' | 'earned' | 'paidLikes';
type Metric = { key: Measure; label: string; value: string; detail: string };
const number = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 1 });
const duration = (n: number) => {
  if (n < 60) return `${number(n)}s`;
  if (n < 3600) return `${number(n / 60)} min`;
  return `${number(n / 3600)} h`;
};
const date = (n: number) => new Date(n).toLocaleDateString(undefined, { dateStyle: 'medium', timeZone: 'UTC' });
const sections = ['overview', 'reach', 'engagement'] as const;
const comparison = (p: Performance) => {
  if (p.previousPartial || p.partial) return 'Comparison available after a full prior period';
  if (!p.previous.views) return p.summary.views ? 'No activity in the prior period' : 'No change from the prior period';
  const delta = ((p.summary.views - p.previous.views) / p.previous.views) * 100;
  return `${delta >= 0 ? '+' : ''}${number(delta)}% vs previous period`;
};
const metricCopy = (metric: Metric) => (
  <>
    <span>{metric.label}</span>
    <strong>{metric.value}</strong>
    <small>{metric.detail}</small>
  </>
);
const Trend = ({ p, metrics }: { p: Performance; metrics: Metric[] }) => {
  const [selected, setSelected] = useState<Measure>(metrics[0].key);
  const metric = metrics.find((item) => item.key === selected) || metrics[0];
  const measure = metric.key;
  const financial = measure === 'earned' || measure === 'paidLikes';
  const revenue = dailyCreatorRevenue(p);
  const series = p.series.map((row, i) => ({ ...row, ...revenue[i], earned: Number(revenue[i].earnedAe) }));
  const unavailable = (at: number) => (financial ? p.finance.stale : at + 86400000 <= p.since);
  const values = series.map((row) => (unavailable(row.at) ? null : row[measure]));
  const maximum = measure === 'completion' ? 1 : Math.max(measure === 'earned' ? 0.01 : 1, ...values.map((v) => v ?? 0));
  const label = (value: number) => {
    if (measure === 'earned') return `${number(value)} AE`;
    if (measure === 'completion') return `${number(value * 100)}%`;
    if (measure === 'watchSeconds' || measure === 'averageSeconds') return duration(value);
    return number(value);
  };
  const valueLabel = (i: number) => {
    if (values[i] === null) return financial && p.finance.stale ? 'Syncing' : 'Not measured';
    return measure === 'earned' ? `${series[i].earnedAe} AE` : label(values[i]!);
  };
  const points = values.map((value, i) => (value === null ? null : {
    x: values.length === 1 ? 500 : 8 + (i / (values.length - 1)) * 984,
    y: 188 - (value / maximum) * 172,
  }));
  const path = points.map((point, i) => (point ? `${i && points[i - 1] ? 'L' : 'M'}${point.x},${point.y}` : '')).join(' ');
  const hasData = points.some(Boolean);
  return (
    <section className="ss-panel ss-performance-panel" aria-label="Performance chart">
      <div className="ss-metric-tabs" role="group" aria-label="Chart metric">
        {metrics.map((item) => (
          <button type="button" key={item.key} className="ss-metric" aria-pressed={item.key === measure} onClick={() => setSelected(item.key)}>
            {metricCopy(item)}
          </button>
        ))}
      </div>
      <div className="ss-performance-body">
        <div className="ss-chart-caption">
          <h2>{metric.label}</h2>
          <span>Daily · UTC</span>
        </div>
        {hasData ? (
          <div className="ss-line-chart" role="img" aria-label={`Daily ${metric.label.toLowerCase()} for the selected ${p.days} days. Values are available in the daily data table.`}>
            <svg viewBox="0 0 1000 204" preserveAspectRatio="none" aria-hidden="true">
              {[16, 102, 188].map((y) => <line key={y} x1="0" x2="1000" y1={y} y2={y} className="ss-chart-gridline" />)}
              <path d={path} className="ss-chart-line" vectorEffect="non-scaling-stroke" />
              {points.map((point, i) => point && (
                <circle key={series[i].at} cx={point.x} cy={point.y} r="3" className="ss-chart-point">
                  <title>{`${date(series[i].at)}: ${measure === 'earned' ? `${series[i].earnedAe} AE` : label(values[i]!)}`}</title>
                </circle>
              ))}
            </svg>
            <div className="ss-chart-scale" aria-hidden="true">
              <span>{label(maximum)}</span>
              <span>{label(maximum / 2)}</span>
              <span>{label(0)}</span>
            </div>
          </div>
        ) : <div className="ss-chart-empty">{financial && p.finance.stale ? 'Reward history is updating.' : 'No measured activity for this metric yet.'}</div>}
        <div className="ss-chart-axis">
          <span>{date(p.start)}</span>
          <span>{date(p.end - 1)}</span>
        </div>
        <details className="ss-chart-data">
          <summary>View daily data</summary>
          <div className="ss-table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Date (UTC)</th>
                  <th scope="col">{metric.label}</th>
                </tr>
              </thead>
              <tbody>
                {series.map((row, i) => (
                  <tr key={row.at}>
                    <td>{new Date(row.at).toISOString().slice(0, 10)}</td>
                    <td>{valueLabel(i)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>
    </section>
  );
};
const Retention = ({ p }: { p: Performance }) => (
  <section className="ss-panel">
    <h2>Audience retention</h2>
    <p>{p.summary.completion === null ? 'Waiting for qualified views' : `${number(p.summary.completion * 100)}% watched at least 95% of the video`}</p>
    {p.summary.views > 0 && p.summary.retention.length ? (
      <div className="ss-retention">
        {p.summary.retention.map((row) => (
          <div key={row.at}>
            <span>{`${row.at}% watched`}</span>
            <meter min={0} max={p.summary.views} value={row.viewers} aria-label={`${row.at}% watched`} />
            <b>{row.viewers}</b>
          </div>
        ))}
      </div>
    ) : <p className="ss-card-empty">Retention appears once there is enough playback data.</p>}
    <small>Cumulative watch time, excluding seek jumps; not a frame-by-frame retention curve.</small>
  </section>
);
const Sources = ({ p }: { p: Performance }) => {
  const maximum = Math.max(1, ...p.sources.map((row) => (row.suppressed ? 0 : row.views || 0)));
  return (
    <section className="ss-panel">
      <h2>How viewers find you</h2>
      <p>Measured views · Selected period</p>
      <div className="ss-source-bars">
        {p.sources.map((row) => (
          <div key={row.source}>
            <span>{row.source.replace(/-/g, ' ')}</span>
            {row.suppressed ? <small>Not enough data</small> : (
              <>
                <meter min={0} max={maximum} value={row.views || 0} aria-label={row.source} />
                <b>{number(row.views || 0)}</b>
              </>
            )}
          </div>
        ))}
      </div>
      {!p.sources.length && <p className="ss-card-empty">Traffic sources appear as viewers discover your Shorts.</p>}
      <small>Each source needs at least 5 distinct browsers to protect viewer privacy.</small>
    </section>
  );
};
const TopShorts = ({ s, p }: { s: State; p: Performance }) => {
  const videos = [...(s.dashboard?.shorts || [])].filter((v) => p.videos[v.id]?.views > 0)
    .sort((a, b) => p.videos[b.id].views - p.videos[a.id].views).slice(0, 5);
  return (
    <section className="ss-panel ss-top-shorts">
      <div className="sh-section-head">
        <div>
          <h2>Top Shorts</h2>
          <p>Measured views · Selected period</p>
        </div>
        <Link className="ss-text-link" to="/shorts/studio/content?sort=views">
          View all
          <ArrowUpRight size={14} />
        </Link>
      </div>
      {videos.length ? videos.map((v, i) => (
        <Link key={v.id} to={`/shorts/studio/video/${encodeURIComponent(v.id)}?panel=analytics`}>
          <span className="ss-rank">{i + 1}</span>
          {v.status === 'active' ? <img src={shortsMediaUrl(v.id, 'poster.jpg')} alt="" loading="lazy" /> : <Clapperboard size={18} />}
          <span>{v.title}</span>
          <b>{number(p.videos[v.id].views)}</b>
        </Link>
      )) : <p className="ss-card-empty">Your most viewed Shorts will appear here.</p>}
    </section>
  );
};
export const StudioAnalytics = ({ s, compact = false }: { s: State; compact?: boolean }) => {
  const [params] = useSearchParams();
  const section = sections.find((value) => value === params.get('analytics')) || 'overview';
  const p = s.performance;
  if (!p) {
    return s.performanceError ? (
      <div className="ss-panel ss-data-error" role="alert">
        <div>
          <h2>Couldn’t update analytics</h2>
          <p>{s.performanceError}</p>
        </div>
        <button type="button" onClick={s.refreshPerformance}>Try again</button>
      </div>
    ) : <StudioSkeleton page={compact ? 'summary' : 'analytics'} label="Loading your analytics…" />;
  }
  const m = p.summary;
  const metrics: Record<Measure, Metric> = {
    views: {
      key: 'views', label: 'Views', value: number(m.views), detail: comparison(p),
    },
    reach: {
      key: 'reach', label: 'Browser reach', value: number(m.reach), detail: 'Distinct browsers, not people',
    },
    watchSeconds: {
      key: 'watchSeconds', label: 'Watch time', value: duration(m.watchSeconds), detail: m.averageSeconds === null ? 'No qualified plays yet' : `${duration(m.averageSeconds)} average per view`,
    },
    averageSeconds: {
      key: 'averageSeconds', label: 'Average view duration', value: m.averageSeconds === null ? '—' : duration(m.averageSeconds), detail: 'Per qualified view',
    },
    completion: {
      key: 'completion', label: 'Completion rate', value: m.completion === null ? '—' : `${number(m.completion * 100)}%`, detail: 'Watched at least 95% of the video',
    },
    paidLikes: {
      key: 'paidLikes', label: 'Paid Likes', value: p.finance.stale ? '—' : number(p.finance.paidLikes), detail: 'Confirmed in this period',
    },
    earned: {
      key: 'earned', label: 'Creator earnings', value: p.finance.stale ? 'Syncing…' : `${p.finance.earned} AE`, detail: 'After the treasury share',
    },
  };
  let keys: Measure[] = ['views', 'watchSeconds', 'paidLikes', 'earned'];
  if (!compact && section === 'reach') keys = ['views', 'reach'];
  if (!compact && section === 'engagement') keys = ['watchSeconds', 'averageSeconds', 'completion'];
  const selectedMetrics = keys.map((key) => metrics[key]);
  return (
    <div className={compact ? 'ss-analytics-summary' : 'ss-analytics'}>
      {s.performanceError && (
      <div className="ss-panel ss-data-error" role="alert">
        <p>Performance could not be updated. Showing the last available report.</p>
        <button type="button" onClick={s.refreshPerformance}>Try again</button>
      </div>
      )}
      <div className="ss-analytics-toolbar">
        {compact ? <b>Your performance</b> : (
          <nav className="ss-section-tabs" aria-label="Analytics sections">
            {sections.map((value) => {
              const next = new URLSearchParams(params);
              next.set('analytics', value);
              return <Link key={value} to={{ search: `?${next}` }} aria-current={section === value ? 'page' : undefined}>{value[0].toUpperCase() + value.slice(1)}</Link>;
            })}
          </nav>
        )}
        <div className="ss-analytics-period">
          <span>{`${date(p.start)} – ${date(p.end - 1)} · UTC`}</span>
          <select aria-label="Analytics period" value={s.days} onChange={(e) => s.setDays(Number(e.target.value))}>{[7, 28, 90].map((days) => <option key={days} value={days}>{`Last ${days} days`}</option>)}</select>
        </div>
      </div>
      {compact ? <div className="ss-metrics ss-metrics-strip">{selectedMetrics.map((metric) => <div className="ss-metric" key={metric.key}>{metricCopy(metric)}</div>)}</div>
        : <Trend key={`${section}-${s.videoId || 'channel'}`} p={p} metrics={selectedMetrics} />}
      {!compact && (
        <div className="ss-two-col ss-analytics-cards">
          {section !== 'engagement' && <Sources p={p} />}
          {section === 'engagement' || s.videoId ? <Retention p={p} /> : <TopShorts s={s} p={p} />}
          {section === 'engagement' && (
          <section className="ss-panel">
            <h2>How engagement is measured</h2>
            <p>Watch time counts unique played segments from qualified views. Seeking, pauses, background playback and repeated segments are excluded.</p>
            <p>A view qualifies after 2 seconds, once per browser, Short and UTC day. Watch time is capped at the video length for each daily view. Watch hours equal watch seconds divided by 3,600.</p>
            <p>Completion measures how many qualified views watched at least 95% of the video.</p>
            <small>Views and watch time are counted automatically during playback.</small>
          </section>
          )}
        </div>
      )}
      <div className="ss-analytics-notes">
        <details className="ss-measurement-note">
          <summary>
            {p.partial ? 'Partial data · ' : ''}
            About these numbers
          </summary>
          <p>{`Playback measurement started ${date(p.since)}. ${p.partial ? 'This period has partial coverage. ' : ''}Views and watch time are counted automatically. Views require 2 seconds, capped at one per browser, Short and UTC day. History is retained for 90 days.`}</p>
          <p>Watch time includes unique played segments from qualified views, capped at the video length per daily view. Watch hours = watch seconds ÷ 3,600. Shorter totals display in seconds or minutes.</p>
          <p>{`Browser reach: ${number(m.reach)} distinct browsers, not people. Daily reach must not be added to calculate period reach.`}</p>
        </details>
        {compact && (
        <Link className="ss-text-link ss-analytics-link" to="/shorts/studio/analytics">
          Explore audience analytics
          <ArrowUpRight size={15} />
        </Link>
        )}
      </div>
    </div>
  );
};
