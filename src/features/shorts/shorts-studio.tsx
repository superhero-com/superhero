import HeaderWalletButton from '@/components/layout/app-header/HeaderWalletButton';
import { ConnectWalletButton } from '@/components/ConnectWalletButton';
import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  ArrowLeft, ArrowUpRight, BarChart3, Clapperboard, Cloud, Coins, LayoutDashboard, Plus, ShieldCheck,
} from 'lucide-react';
import { SHORTS_API } from './api';
import { ShortsUpload } from './shorts-upload';
import { dailyCreatorRevenue } from './shorts-trends';
import type { useShorts } from './use-shorts';
import type { Performance, Short, VisualSafety } from './types';
import { ShortsJourney } from './shorts-journey';
import {
  ShortsGuidelines, feedLabel, guidelinesStatus, hostingStatus,
} from './shorts-guidelines';
import './shorts-studio.css';

type State = ReturnType<typeof useShorts>;
const SafetyReceipt = ({ safety, busy, retry }: { safety?: VisualSafety; busy: boolean; retry: () => void }) => (
  <section className="ss-safety">
    <h3>Visual content inspection</h3>
    <span className={`ss-pill ${safety?.status || 'pending'}`}>
      {({
        no_flags: 'No sampled flags', review: 'Needs visual review', blocked: 'Feed excluded', error: 'Scan incomplete',
      }[safety?.status || 'error'])}
    </span>
    <p>{safety?.reason || 'This video must be scanned before feed inclusion.'}</p>
    {safety?.frameCount && <p>{`${safety.frameCount} frames · ${safety.sampling} · highest NSFW score ${((safety.maxNsfwScore || 0) * 100).toFixed(1)}%`}</p>}
    {!!safety?.labels?.length && <p>{`Visual topic suggestions: ${safety.labels.map((label) => label.topic).join(', ')}`}</p>}
    <small>Model scores are screening signals. Sampled frames can miss brief content; the full video still needs human review.</small>
    <div className="ss-action-row"><button type="button" disabled={busy} onClick={retry}>Rescan video</button></div>
    {!!safety?.frames?.length && (
      <details>
        <summary>{`Frame evidence (${safety.frameCount})`}</summary>
        <div className="ss-frame-evidence ss-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>NSFW score</th>
                <th>Visual labels</th>
              </tr>
            </thead>
            <tbody>
              {safety.frames.filter((frame, index, all) => all.findIndex((other) => other.at === frame.at && other.sha256 === frame.sha256) === index).map((frame) => (
                <tr key={`${frame.at}-${frame.sha256}`}>
                  <td>{`${frame.at.toFixed(2)}s`}</td>
                  <td>{`${(frame.nsfwScore * 100).toFixed(1)}%`}</td>
                  <td>{frame.labels.map((label) => label.topic).join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>{`Policy: ${safety.policy}`}</p>
        <code className="sh-address">{safety.evidenceHash}</code>
      </details>
    )}
  </section>
);
export const shortDate = (n: number) => (n ? new Date(n).toLocaleDateString(undefined, { dateStyle: 'medium', timeZone: 'UTC' }) : 'Not activated');
const number = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 1 });
const duration = (n: number) => (n < 60 ? `${number(n)}s` : `${number(n / 60)} min`);
const statusLabel = (s: string) => ({
  active: 'In the feed', ready: 'Feed eligible', pending: 'In review', rejected: 'Not in the feed', expired: 'Hosting expired', withdrawn: 'Withdrawn',
}[s] || s);
const left = (s: Short) => Math.max(0, Math.ceil((s.until - Date.now()) / 86400000));
const hostingLabel = (v: Short) => ({
  active: 'Hosting active', expired: 'Hosting expired', withdrawn: 'Withdrawn', unfunded: 'Ready for hosting',
}[hostingStatus(v)]);
const coverageLabel = (v: Short) => {
  if (hostingStatus(v) === 'withdrawn') return 'Hosting stopped';
  return v.until ? `${left(v)} days remaining` : 'No coverage purchased';
};
const coverageDate = (v: Short) => {
  if (hostingStatus(v) === 'withdrawn') return 'Withdrawn';
  return v.until ? `Coverage ends ${shortDate(v.until)}` : 'Hosting not yet funded';
};
const transactionUrl = (tx: string) => `https://testnet.aescan.io/transactions/${tx}`;
const Metric = ({ label, value, detail }: { label: string; value: string; detail: string }) => (
  <div className="ss-metric">
    <span>{label}</span>
    <strong>{value}</strong>
    <small>{detail}</small>
  </div>
);
function comparison(current: number, previous: number, partial: boolean) {
  if (partial) return 'Comparison available after a full prior period';
  if (!previous) return current ? 'No activity in the prior period' : 'No change from the prior period';
  const delta = ((current - previous) / previous) * 100;
  return `${delta >= 0 ? '+' : ''}${number(delta)}% vs previous period`;
}
const Trend = ({ performance: p }: { performance: Performance }) => {
  const [measure, setMeasure] = useState<'views' | 'reach' | 'watchSeconds' | 'earned' | 'paidLikes'>('views');
  const financial = measure === 'earned' || measure === 'paidLikes';
  const revenue = dailyCreatorRevenue(p);
  const series = p.series.map((row, i) => ({
    ...row, ...revenue[i], earned: Number(revenue[i].earnedAe),
  }));
  const max = Math.max(measure === 'earned' ? 0.01 : 1, ...series.map((v) => v[measure]));
  const unavailable = (at: number) => (financial ? p.finance.stale : at + 86400000 <= p.since);
  const valueLabel = (row: typeof series[number]) => (measure === 'earned'
    ? `${row.earnedAe} AE` : number(row[measure]));
  const maximumLabel = measure === 'earned' ? `${max} AE` : number(max);
  return (
    <section className="ss-panel ss-trend">
      <div className="sh-section-head">
        <div>
          <h2>{financial ? 'Your creator rewards over time' : 'Your audience over time'}</h2>
          <p>Daily activity · UTC</p>
        </div>
        <label className="ss-select" htmlFor="shorts-chart-metric">
          Metric
          <select id="shorts-chart-metric" aria-label="Chart metric" value={measure} onChange={(event) => setMeasure(event.target.value as typeof measure)}>
            <option value="views">Views</option>
            <option value="reach">Browser reach</option>
            <option value="watchSeconds">Watch seconds</option>
            <option value="earned">Creator earnings (AE)</option>
            <option value="paidLikes">Confirmed paid Likes</option>
          </select>
        </label>
      </div>
      {financial && <p>{p.finance.stale ? 'Revenue history is syncing. Daily amounts are unavailable.' : 'Confirmed creator accruals before hosting allocation. Claims and refunds are separate from earnings.'}</p>}
      <div className="ss-chart" role="img" aria-label={`Daily ${measure} for the selected ${p.days} days. A data table follows.`}>
        <span className="ss-chart-max">{financial && p.finance.stale ? 'Syncing' : maximumLabel}</span>
        <div className="ss-bars">{series.map((v) => <div key={v.at} className={unavailable(v.at) ? 'ss-unmeasured' : 'ss-bar-slot'} title={`${shortDate(v.at)}: ${unavailable(v.at) ? 'Unavailable' : valueLabel(v)}`}><span style={{ height: `${unavailable(v.at) ? 0 : (v[measure] / max) * 100}%` }} /></div>)}</div>
      </div>
      <div className="ss-chart-axis">
        <span>{shortDate(p.start)}</span>
        <span>{shortDate(p.end - 1)}</span>
      </div>
      <details className="ss-chart-data">
        <summary>View daily data</summary>
        <div className="ss-table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Date (UTC)</th>
                <th scope="col">Views</th>
                <th scope="col">Browser reach</th>
                <th scope="col">Watch seconds</th>
                <th scope="col">Creator earnings (AE)</th>
                <th scope="col">Confirmed paid Likes</th>
              </tr>
            </thead>
            <tbody>
              {series.map((v) => (
                <tr key={v.at}>
                  <td>{new Date(v.at).toISOString().slice(0, 10)}</td>
                  <td>{v.at + 86400000 <= p.since ? 'Not measured' : v.views}</td>
                  <td>{v.at + 86400000 <= p.since ? '—' : v.reach}</td>
                  <td>{v.at + 86400000 <= p.since ? '—' : number(v.watchSeconds)}</td>
                  <td>{p.finance.stale ? 'Syncing' : v.earnedAe}</td>
                  <td>{p.finance.stale ? 'Syncing' : v.paidLikes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
};
const Analytics = ({ s }: { s: State }) => {
  const p = s.performance;
  if (!p) return <div className="ss-panel" role="status">{s.performanceError || 'Loading your analytics…'}</div>;
  const { summary: m } = p;
  return (
    <>
      <div className="ss-period">
        <div>
          <b>{s.videoId ? 'This Short’s performance' : 'Your performance'}</b>
          <p>
            {shortDate(p.start)}
            {' '}
            –
            {' '}
            {shortDate(p.end - 1)}
            {' '}
            · UTC
          </p>
        </div>
        <select aria-label="Analytics period" value={s.days} onChange={(event) => s.setDays(Number(event.target.value))}>
          {[7, 28, 90].map((d) => (
            <option key={d} value={d}>
              {`Last ${d} days`}
            </option>
          ))}
        </select>
      </div>
      <div className="ss-metrics">
        <Metric label="Measured views" value={number(m.views)} detail={comparison(m.views, p.previous.views, p.previousPartial || p.partial)} />
        <Metric label="Browser reach" value={number(m.reach)} detail="Distinct consenting browsers, not people" />
        <Metric label="Watch time" value={duration(m.watchSeconds)} detail={m.averageSeconds === null ? 'No qualified plays yet' : `${duration(m.averageSeconds)} average per view`} />
        <Metric label="Creator earnings" value={p.finance.stale ? 'Syncing…' : `${p.finance.earned} AE`} detail={p.finance.stale ? 'Revenue history is not current' : `${p.finance.paidLikes} paid Likes · after treasury share`} />
      </div>
      <p className="ss-measurement-note">
        Playback measurement started
        {' '}
        {shortDate(p.since)}
        {'. '}
        {p.partial ? 'This period has partial coverage. ' : ''}
        Only opted-in playback is measured. Views require 2 seconds, capped at one per browser, Short and UTC day. History is retained for 90 days.
      </p>
      <Trend performance={p} />
      <div className="ss-two-col">
        <section className="ss-panel">
          <span className="sh-eyebrow">AUDIENCE RETENTION</span>
          <h2>{m.completion === null ? 'Waiting for views' : `${number(m.completion * 100)}% complete`}</h2>
          <p>A completed view watches at least 95% of the video.</p>
          <div className="ss-retention">
            {m.retention.map((v) => (
              <div key={v.at}>
                <span>
                  {v.at}
                  % watched
                </span>
                <meter min={0} max={Math.max(1, m.views)} value={v.viewers} aria-label={`${v.at}% watched`} />
                <b>{v.viewers}</b>
              </div>
            ))}
          </div>
          <small>Cumulative watch time, excluding seek jumps; this is not a frame-by-frame retention curve.</small>
        </section>
        <section className="ss-panel">
          <span className="sh-eyebrow">DISCOVERY</span>
          <h2>Where viewers find you</h2>
          <div className="ss-sources">
            {p.sources.map((v) => (
              <div key={v.source}>
                <span>{v.source.replace('-', ' ')}</span>
                <b>{v.suppressed ? 'Not enough data' : number(v.views || 0)}</b>
              </div>
            ))}
          </div>
          <small>Each source needs at least 5 distinct browsers to protect viewer privacy.</small>
        </section>
      </div>
    </>
  );
};
const Content = ({ s, compact = false }: { s: State; compact?: boolean }) => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const rows = (s.dashboard?.shorts || []).filter((v) => (status === 'all' || v.status === status) && `${v.title} ${v.topic}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <section className="ss-panel">
      <div className="sh-section-head">
        <div>
          <h2>{compact ? 'Your latest Shorts' : 'Your content'}</h2>
          <p>Track performance and manage each publication.</p>
        </div>
        <Link className="ss-button primary" to="/shorts/studio/upload">
          <Plus size={17} />
          {' '}
          Create Short
        </Link>
      </div>
      {!compact && (
      <div className="ss-content-filters">
        <input aria-label="Search your Shorts" value={search} placeholder="Search title or topic" onChange={(e) => setSearch(e.target.value)} />
        <select aria-label="Content status" value={status} onChange={(e) => setStatus(e.target.value)}>{['all', 'active', 'pending', 'ready', 'rejected', 'expired', 'withdrawn'].map((v) => <option key={v} value={v}>{v === 'all' ? 'All statuses' : statusLabel(v)}</option>)}</select>
      </div>
      )}
      <div className="ss-table-wrap">
        <table className="ss-content-table">
          <thead>
            <tr>
              <th scope="col">Short</th>
              <th scope="col">Feed visibility</th>
              <th scope="col">Measured views</th>
              <th scope="col">Paid Likes</th>
              <th scope="col">Coverage</th>
              <th scope="col">Manage</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, compact ? 5 : 50).map((v) => (
              <tr key={v.id}>
                <td>
                  <Link className="ss-video-title" to={`/shorts/studio/video/${v.id}`}>
                    {v.status === 'active' ? <img src={`${SHORTS_API}${v.posterUrl}`} alt="" /> : <span className="ss-thumbnail"><Clapperboard size={21} /></span>}
                    <span>
                      <b>{v.title}</b>
                      <small>
                        {v.topic}
                        {' '}
                        ·
                        {' '}
                        {number(v.duration)}
                        s
                      </small>
                    </span>
                  </Link>
                </td>
                <td><span className={`ss-pill ${v.status}`}>{feedLabel(v)}</span></td>
                <td>{s.performance?.videos[v.id]?.views ?? '—'}</td>
                <td>
                  {v.likes}
                  <small className="ss-cell-note">Lifetime</small>
                </td>
                <td>{coverageLabel(v)}</td>
                <td>
                  <Link className="ss-text-link" to={`/shorts/studio/video/${v.id}`}>
                    Open
                    <ArrowUpRight size={14} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && (
      <div className="ss-empty">
        <Clapperboard size={30} />
        <h3>{search || status !== 'all' ? 'No matching Shorts' : 'Your next idea belongs here'}</h3>
        <p>{search || status !== 'all' ? 'Try another search or status.' : 'Upload your first video and choose your hosting coverage. Feed eligibility is reviewed separately.'}</p>
      </div>
      )}
      {compact && <Link className="ss-text-link" to="/shorts/studio/content">View all content →</Link>}
    </section>
  );
};
const actionLabel: Record<string, string> = {
  PaidLike: 'Creator reward', HostingFunded: 'Hosting funded', HostingRefunded: 'Hosting restored', Claimed: 'Rewards claimed', Activated: 'Hosting activated', QuoteOpened: 'Quote created', StorageSettled: 'Hosting service paid', Withdrawn: 'Short withdrawn',
};
const Ledger = ({ s, hosting = false }: { s: State; hosting?: boolean }) => {
  const p = s.performance;
  if (!p) return <p>{s.performanceError || 'Loading verified history…'}</p>;
  const rows = p.finance.entries.filter((e) => e.at >= p.start && e.at < p.end && (hosting ? ['HostingFunded', 'HostingRefunded', 'Activated', 'StorageSettled'].includes(e.action) : ['PaidLike', 'Claimed', 'HostingFunded', 'HostingRefunded'].includes(e.action)));
  return (
    <section className="ss-panel">
      <h2>{hosting ? 'Hosting activity' : 'Revenue activity'}</h2>
      <p>
        {s.days}
        -day window ·
        {' '}
        {p.finance.confirmationsRequired}
        {' '}
        block confirmations required · Last sync
        {' '}
        {p.finance.syncedAt ? new Date(p.finance.syncedAt).toLocaleTimeString() : 'pending'}
      </p>
      {p.finance.stale && <div className="sh-notice" role="status">{p.finance.message || 'History sync is pending. Amounts below may be outdated.'}</div>}
      <div className="ss-table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Activity</th>
              <th scope="col">Date</th>
              <th scope="col">Amount</th>
              <th scope="col">Source</th>
              <th scope="col">Transaction</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id}>
                <td>
                  <b>{actionLabel[e.action] || e.action}</b>
                  <small className="ss-cell-note">{e.confirmed ? 'Confirmed' : 'Awaiting confirmations'}</small>
                  {e.shortId && <Link className="ss-text-link" to={`/shorts/studio/video/${encodeURIComponent(e.shortId)}`}>View Short</Link>}
                  {e.quoteId && <small className="ss-cell-note">{`Hosting purchase #${e.quoteId}`}</small>}
                </td>
                <td>{shortDate(e.at)}</td>
                <td>{['Activated'].includes(e.action) ? '—' : `${e.amountAe} AE`}</td>
                <td>{e.source || (e.action === 'PaidLike' ? 'Paid Like' : 'Rewards')}</td>
                <td>
                  <a className="ss-text-link" href={transactionUrl(e.tx)} target="_blank" rel="noreferrer">
                    View receipt
                    <ArrowUpRight size={14} />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && (
      <p>
        No
        {hosting ? 'hosting' : 'revenue'}
        {' '}
        activity in this period.
      </p>
      )}
    </section>
  );
};
const Rewards = ({ s }: { s: State }) => {
  const a = s.dashboard!.account;
  return (
    <section className="ss-rewards">
      <div>
        <span className="sh-eyebrow">AVAILABLE TO YOU</span>
        <h2>
          {a.available}
          {' '}
          <span>AE</span>
        </h2>
        <p>Claim to your wallet or put your rewards toward hosting.</p>
      </div>
      <button type="button" className="primary" disabled={s.busy || Number(a.available) <= 0} onClick={() => s.setClaimReview(true)}>
        Review claim
        <ArrowUpRight size={17} />
      </button>
    </section>
  );
};
const Hosting = ({ s }: { s: State }) => {
  const [threshold, setThreshold] = useState(() => { try { return Number(localStorage.getItem('shorts.coverage.warning')) || 7; } catch { return 7; } });
  const rows = s.dashboard!.shorts;
  return (
    <>
      <section className="ss-panel">
        <div className="sh-section-head">
          <div>
            <span className="sh-eyebrow">PREPAID COVERAGE</span>
            <h2>Keep your stories available</h2>
            <p>Purchased days stay protected if the tariff changes.</p>
          </div>
          <label className="ss-select" htmlFor="shorts-coverage-threshold">
            Highlight below
            <select id="shorts-coverage-threshold" aria-label="Low hosting coverage threshold" value={threshold} onChange={(e) => { setThreshold(Number(e.target.value)); try { localStorage.setItem('shorts.coverage.warning', e.target.value); } catch { /* Session-only preference. */ } }}>
              {[3, 7, 14, 30].map((n) => (
                <option key={n} value={n}>
                  {n}
                  {' '}
                  days
                </option>
              ))}
            </select>
          </label>
        </div>
        <p>Warnings appear here while you use Studio. Top-ups are manual; no automatic wallet debit.</p>
        <div className="ss-hosting-list">
          {rows.map((v) => (
            <div key={v.id} className="ss-hosting-item">
              <div>
                <Link to={`/shorts/studio/video/${v.id}`}><b>{v.title}</b></Link>
                <p>
                  {number(v.bytes / 1e6)}
                  {' '}
                  MB ·
                  {' '}
                  {coverageDate(v)}
                </p>
                <span className={`ss-pill ${hostingStatus(v) === 'active' && left(v) <= threshold ? 'expired' : hostingStatus(v)}`}>{coverageLabel(v)}</span>
                <small className="ss-cell-note">{feedLabel(v)}</small>
              </div>
              <button type="button" disabled={s.busy || hostingStatus(v) === 'withdrawn'} onClick={() => s.openFunding(v)}>{v.until ? 'Extend hosting' : 'Choose hosting'}</button>
            </div>
          ))}
        </div>
        {!rows.length && <p>Upload a Short to see its hosting coverage here.</p>}
        <small>Two local IPFS replicas in this preview. Expiration stops official playback and managed pinning; it cannot erase independently retained IPFS copies.</small>
      </section>
      <Ledger s={s} hosting />
    </>
  );
};
const VideoDetail = ({ s }: { s: State }) => {
  const [appeal, setAppeal] = useState('');
  const video = s.dashboard?.shorts.find((v) => v.id === s.videoId);
  if (!video && (s.busy || !s.dashboard)) return <div className="ss-panel" role="status">Loading your Short…</div>;
  if (!video) return <div className="ss-panel">This Short is not in your creator account.</div>;
  return (
    <>
      <Link className="ss-text-link" to="/shorts/studio/content">← All content</Link>
      <ShortsJourney video={video} busy={s.busy} fund={() => s.openFunding(video)} />
      <section className="ss-panel ss-video-detail">
        <div>
          <span className={`ss-pill ${hostingStatus(video)}`}>{hostingLabel(video)}</span>
          <h2>{video.title}</h2>
          <p>{video.description || 'No description added.'}</p>
          <p>
            {video.topic}
            {' '}
            ·
            {' '}
            {video.language || 'Language unspecified'}
            {' '}
            ·
            {' '}
            {number(video.duration)}
            {' '}
            seconds ·
            {' '}
            {number(video.bytes / 1e6)}
            {' '}
            MB
          </p>
          <ShortsGuidelines video={video} busy={s.busy} retry={() => s.rescan(video.id)} />
          <div className="ss-action-row">
            <button type="button" disabled={s.busy} onClick={() => s.reviewClip(video.id)}>Load private preview</button>
            {hostingStatus(video) === 'active' && <button type="button" disabled={s.busy} onClick={() => s.setWithdrawal(video)}>Withdraw</button>}
          </div>
          <details>
            <summary>Storage details</summary>
            <p>Immutable package CID</p>
            <code>{video.cid}</code>
          </details>
          <small>Published metadata belongs to the immutable package. Upload a new revision to change the video or its captions.</small>
        </div>
        {s.preview?.id === video.id && <video src={s.preview.url} controls playsInline className="ss-upload-preview"><track kind="captions" /></video>}
      </section>
      {guidelinesStatus(video) === 'ineligible' && (
      <section className="ss-panel">
        <h2>Request another review</h2>
        {video.appeal?.status === 'pending' ? (
          <p>
            Your appeal is awaiting review:
            {video.appeal.message}
          </p>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); s.appeal(video.id, appeal); }}>
            <label htmlFor="short-appeal">
              Explain your appeal
              <textarea id="short-appeal" value={appeal} minLength={10} maxLength={1000} required onChange={(e) => setAppeal(e.target.value)} />
            </label>
            <button type="submit" disabled={s.busy} className="primary">Submit appeal</button>
          </form>
        )}
      </section>
      )}
      <Analytics s={s} />
      <Ledger s={s} />
    </>
  );
};
const ReviewQueue = ({ s }: { s: State }) => {
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [reviewTopics, setReviewTopics] = useState<Record<string, string>>({});
  const [visualConfirmed, setVisualConfirmed] = useState<Record<string, boolean>>({});
  return (
    <section className="ss-panel">
      <h2>Moderation queue</h2>
      <p>Review feed eligibility using the actual video, rights, disclosures and reports. These decisions do not cancel paid hosting.</p>
      {s.review.map((v) => (
        <article className="ss-review-item" key={v.id}>
          <span className={`ss-pill ${v.moderation}`}>{v.moderation}</span>
          <h3>{v.title}</h3>
          <p>
            {v.topic}
            {' '}
            ·
            {' '}
            {v.reports}
            {' '}
            reports
          </p>
          <p>{v.classification?.reason}</p>
          <SafetyReceipt safety={v.safety} busy={s.busy} retry={() => s.rescan(v.id)} />
          <p>
            {v.description}
            {' '}
            ·
            {' '}
            {v.language || 'Language unspecified'}
            {' '}
            ·
            {' '}
            {v.synthetic ? 'AI-altered media' : 'No AI disclosure'}
            {' '}
            ·
            {' '}
            {v.sponsored ? 'Sponsored' : 'No sponsorship disclosure'}
          </p>
          <label htmlFor={`review-topic-${v.id}`}>
            Reviewed topic
            <select id={`review-topic-${v.id}`} value={reviewTopics[v.id] || v.reviewedTopic || v.topic} onChange={(event) => setReviewTopics({ ...reviewTopics, [v.id]: event.target.value })}>{s.config?.topics.filter((t) => t !== 'All').map((t) => <option key={t}>{t}</option>)}</select>
          </label>
          {v.reviewHistory?.length ? (
            <details>
              <summary>
                Decision history (
                {v.reviewHistory.length}
                )
              </summary>
              {v.reviewHistory.map((r) => (
                <p key={`${r.at}-${r.operator}-${r.approved}`}>
                  {shortDate(r.at)}
                  {' '}
                  ·
                  {' '}
                  {r.approved ? 'Approved' : 'Restricted'}
                  {' '}
                  ·
                  {' '}
                  {r.topic}
                  :
                  {' '}
                  {r.reason}
                  <span className="sh-address">{r.operator}</span>
                </p>
              ))}
            </details>
          ) : null}
          {v.reportDetails?.map((r) => (
            <p key={r.id}>
              <b>
                {r.reason}
                :
              </b>
              {' '}
              {r.detail || 'No additional details'}
            </p>
          ))}
          {v.appeal && (
          <div className="sh-notice">
            Appeal (
            {v.appeal.status}
            ):
            {v.appeal.message}
          </div>
          )}
          <button type="button" disabled={s.busy} onClick={() => s.reviewClip(v.id)}>Load private preview</button>
          {s.preview?.id === v.id && <video className="ss-upload-preview" src={s.preview.url} controls playsInline><track kind="captions" /></video>}
          <label htmlFor={`reason-${v.id}`}>
            Decision reason
            <textarea id={`reason-${v.id}`} maxLength={1000} value={reasons[v.id] || ''} onChange={(e) => setReasons({ ...reasons, [v.id]: e.target.value })} />
          </label>
          <div className="ss-action-row">
            {v.safety?.status === 'review' && (
            <label>
              <input type="checkbox" checked={!!visualConfirmed[v.id]} onChange={(event) => setVisualConfirmed({ ...visualConfirmed, [v.id]: event.target.checked })} />
              {' '}
              I reviewed the full video and the flagged timestamps.
            </label>
            )}
            <button type="button" className="primary" disabled={s.busy || !reasons[v.id]?.trim() || !v.safety || ['error', 'blocked'].includes(v.safety.status) || (v.safety.status === 'review' && !visualConfirmed[v.id])} onClick={() => s.moderate(v.id, true, reasons[v.id], reviewTopics[v.id] || v.reviewedTopic || v.topic, visualConfirmed[v.id])}>Approve</button>
            <button type="button" disabled={s.busy || !reasons[v.id]?.trim()} onClick={() => s.moderate(v.id, false, reasons[v.id], reviewTopics[v.id] || v.reviewedTopic || v.topic)}>Restrict</button>
          </div>
        </article>
      ))}
    </section>
  );
};
export const ShortsStudio = ({ s }: { s: State }) => {
  const page = s.section;
  const titles: Record<string, string> = {
    overview: 'Your ideas. Your impact.', content: 'Your Shorts', analytics: 'Audience analytics', revenue: 'Your rewards', hosting: 'Hosting & coverage', upload: 'Create a Short', video: 'Short details', review: 'Review & safety',
  };
  return (
    <div className="ss-layout">
      <aside className="ss-sidebar">
        <Link to="/shorts/studio" className="ss-brand">
          <img src="/logo.png" alt="" />
          <span>
            superhero
            <small>CREATOR STUDIO</small>
          </span>
        </Link>
        <Link className="ss-back" to="/shorts">
          <ArrowLeft size={16} />
          {' '}
          Back to Shorts
        </Link>
        <nav aria-label="Creator Studio">
          {[
            ['', 'Overview', LayoutDashboard], ['/content', 'Content', Clapperboard], ['/analytics', 'Analytics', BarChart3], ['/revenue', 'Revenue', Coins], ['/hosting', 'Hosting', Cloud], ['/upload', 'Create Short', Plus], ...(s.isOperator ? [['/review', 'Moderation', ShieldCheck]] : []),
          ].map(([path, label, Icon]) => {
            const Glyph = Icon as typeof Plus; return (
              <NavLink key={String(path)} onClick={s.clearMessage} end to={`/shorts/studio${path}`} className={({ isActive }) => (isActive ? 'selected' : '')}>
                <Glyph size={19} />
                {String(label)}
              </NavLink>
            );
          })}
        </nav>
        <section className="ss-sidebar-account" aria-label="Your Superhero wallet">
          <HeaderWalletButton />
        </section>
      </aside>
      <main className="ss-main">
        {page !== 'upload' && (
        <header className="ss-header">
          <div>
            <span className="sh-eyebrow">YOUR CREATOR SPACE</span>
            <h1>{titles[page] || 'Creator Studio'}</h1>
          </div>
          {s.authenticated && <button type="button" disabled={s.busy} onClick={s.refreshNow} aria-label="Refresh Studio">Refresh</button>}
        </header>
        )}
        {page !== 'upload' && (
        <div className="ss-health">
          <span className={s.config?.ipfs ? 'sh-dot' : 'sh-dot offline'} />
          {s.config ? `Testnet · IPFS ${s.config.ipfs ? 'ready' : 'offline'}` : 'Connecting…'}
          <span>{`${s.config?.replicas || 0} storage replicas · ${s.config?.visualModeration ? 'Community-guidelines checks available' : 'Community-guidelines checks temporarily unavailable'}`}</span>
        </div>
        )}
        {s.message && (page !== 'upload' || s.messageTone === 'error') && (
        <div className={`sh-notice ss-message ${s.messageTone}`} role={s.messageTone === 'error' ? 'alert' : 'status'}>
          <span>{s.message}</span>
          <button type="button" onClick={s.clearMessage} aria-label="Dismiss message">×</button>
        </div>
        )}
        {!s.authenticated && !s.restoringCreatorSession && page !== 'upload' ? (
          <div className="ss-welcome ss-panel">
            <BarChart3 size={45} />
            <h2>A home for your next chapter.</h2>
            <p>See what reaches your audience, manage hosting and collect your rewards.</p>
            {s.actor ? (
              <>
                <button type="button" className="primary" disabled={s.busy} onClick={s.signIn}>Unlock creator tools</button>
                <small>Your Superhero wallet is connected. Confirm ownership once to access private drafts and analytics. This signature does not spend AE.</small>
              </>
            ) : <ConnectWalletButton label="Connect wallet" />}
          </div>
        ) : null}
        {s.restoringCreatorSession && page !== 'upload' && <div className="ss-panel" role="status">Restoring creator access…</div>}
        {page === 'upload' && <ShortsUpload key={s.uploadEpoch} s={s} />}
        {s.authenticated && !s.dashboard && page !== 'upload' && <div className="ss-panel" role="status">Loading your creator account…</div>}
        {s.authenticated && s.dashboard && (
          <>
            {s.dashboard.pending.map((p) => (
              <div className="sh-notice" key={p.id}>
                Hosting purchase
                {p.id}
                {' '}
                needs attention. Refund available after
                {new Date(p.deadline).toLocaleString()}
                .
                <div className="ss-action-row">
                  <button type="button" disabled={s.busy} onClick={() => s.recover(p.id, false)}>Retry activation</button>
                  <button type="button" disabled={s.busy || !p.refundable} onClick={() => s.recover(p.id, true)}>Restore funding</button>
                </div>
              </div>
            ))}
            {page === 'overview' && (
            <>
              <Rewards s={s} />
              <Analytics s={s} />
              <Content s={s} compact />
            </>
            )}
            {page === 'content' && <Content s={s} />}
            {page === 'analytics' && <Analytics s={s} />}
            {page === 'revenue' && (
            <>
              <Rewards s={s} />
              <div className="ss-metrics">
                <Metric label="Lifetime earned" value={`${s.dashboard.account.earned} AE`} detail="Creator share of paid Likes" />
                <Metric label="Claimed to wallet" value={`${s.dashboard.account.claimed} AE`} detail="All-time claims" />
                <Metric label="Allocated to hosting" value={`${s.dashboard.account.allocated} AE`} detail="All-time rewards allocated" />
                <Metric label="Restored rewards" value={`${s.dashboard.account.restored} AE`} detail="Failed hosting refunded to rewards" />
              </div>
              <p>Live contract balances are independent of the date filter. Gas is paid separately. A paid Like sends 80% to the creator and 20% to the treasury.</p>
              <label className="ss-select" htmlFor="shorts-activity-period">
                Activity period
                <select id="shorts-activity-period" value={s.days} onChange={(e) => s.setDays(Number(e.target.value))}>
                  {[7, 28, 90].map((n) => (
                    <option key={n} value={n}>
                      {`Last ${n} days`}
                    </option>
                  ))}
                </select>
              </label>
              <Ledger s={s} />
            </>
            )}
            {page === 'hosting' && <Hosting s={s} />}
            {page === 'video' && <VideoDetail s={s} />}
            {page === 'review' && (s.isOperator ? <ReviewQueue s={s} /> : <p>Operator sign-in is required for moderation.</p>)}
            {!Object.keys(titles).includes(page) && (
            <div className="ss-panel">
              <h2>Page not found</h2>
              <Link to="/shorts/studio">Return to Overview</Link>
            </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};
