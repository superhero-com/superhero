import HeaderWalletButton from '@/components/layout/app-header/HeaderWalletButton';
import { useEffect, useRef, useState } from 'react';
import {
  Link, Navigate, NavLink, useSearchParams,
} from 'react-router-dom';
import {
  ArrowLeft, ArrowUpRight, BarChart3, Clapperboard, LayoutDashboard, Plus, RefreshCw, ShieldCheck,
} from 'lucide-react';
import { shortsMediaUrl } from './shorts-media';
import { StudioContent as Content } from './shorts-studio-content';
import { ShortsUpload } from './shorts-upload';
import { StudioAnalytics as Analytics } from './shorts-studio-analytics';
import type { useShorts } from './use-shorts';
import type { VisualSafety } from './types';
import { ShortsJourney } from './shorts-journey';
import { StudioSkeleton } from './shorts-studio-skeleton';
import {
  ShortsGuidelines, guidelinesStatus, publicationStatus,
} from './shorts-guidelines';
import './shorts-studio.css';

type State = ReturnType<typeof useShorts>;
const DataError = ({ message, retry }: { message: string; retry: () => void }) => (
  <div className="ss-panel ss-data-error" role="alert">
    <div>
      <h2>Couldn’t update this section</h2>
      <p>{message}</p>
    </div>
    <button type="button" onClick={retry}>Try again</button>
  </div>
);
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
const NextSteps = ({ s }: { s: State }) => {
  const videos = s.dashboard!.shorts;
  const drafts = s.dashboard!.library?.draft ?? videos.filter((v) => publicationStatus(v) === 'draft').length;
  const restrictedVideos = videos.filter((v) => publicationStatus(v) !== 'withdrawn' && guidelinesStatus(v) === 'ineligible');
  const restricted = s.dashboard!.library?.restricted ?? restrictedVideos.length;
  const firstRestricted = s.dashboard!.library?.firstRestricted ?? restrictedVideos[0]?.id;
  return (
    <section className="ss-panel ss-next-steps">
      <h2>Next steps</h2>
      {drafts > 0 && (
      <Link to="/shorts/studio/content?status=draft">
        <Clapperboard size={19} />
        <span>
          <b>{`${drafts} draft${drafts === 1 ? '' : 's'} to revisit`}</b>
          <small>Preview and publish when you’re ready.</small>
        </span>
        <ArrowUpRight size={16} />
      </Link>
      )}
      {restricted > 0 && firstRestricted && (
      <Link to={`/shorts/studio/video/${encodeURIComponent(firstRestricted!)}`}>
        <ShieldCheck size={19} />
        <span>
          <b>{`${restricted} Short${restricted === 1 ? '' : 's'} with a feed restriction`}</b>
          <small>Check the reason and request another review.</small>
        </span>
        <ArrowUpRight size={16} />
      </Link>
      )}
      <Link to="/shorts/studio/upload">
        <Plus size={19} />
        <span>
          <b>{(s.dashboard!.library?.all ?? videos.length) ? 'Create your next Short' : 'Share your first Short'}</b>
          <small>Superhero covers hosting. Bring your idea.</small>
        </span>
        <ArrowUpRight size={16} />
      </Link>
    </section>
  );
};
const VideoDetail = ({ s }: { s: State }) => {
  const [appeal, setAppeal] = useState('');
  const [params] = useSearchParams();
  const panel = params.get('panel') === 'analytics' ? 'analytics' : 'details';
  const remote = s.config?.studioPaging ? s.studioVideo : undefined;
  const video = remote ? remote.data?.video : s.dashboard?.shorts.find((v) => v.id === s.videoId);
  if (remote?.error) return <DataError message={remote.error} retry={remote.retry} />;
  if (!video && (remote?.loading || s.busy || !s.dashboard)) return <StudioSkeleton page="video" label="Loading your Short…" />;
  if (!video) return <div className="ss-panel">This Short is not in your creator account.</div>;
  return (
    <>
      <Link className="ss-text-link" to="/shorts/studio/content">← All content</Link>
      <div className="ss-video-context">
        {video.status === 'active' ? <img src={shortsMediaUrl(video.id, 'poster.jpg')} alt="" /> : <span className="ss-thumbnail"><Clapperboard size={22} /></span>}
        <div>
          <h2>{video.title}</h2>
          <small>{`${video.topic} · ${number(video.duration)} seconds`}</small>
        </div>
        <span className={`ss-pill ${publicationStatus(video)}`}>{{ published: 'Published', draft: 'Draft', withdrawn: 'Withdrawn' }[publicationStatus(video)]}</span>
      </div>
      <nav className="ss-section-tabs ss-video-tabs" aria-label="Short sections">
        {['details', 'analytics'].map((value) => <Link key={value} to={{ search: `?panel=${value}` }} aria-current={panel === value ? 'page' : undefined}>{value[0].toUpperCase() + value.slice(1)}</Link>)}
      </nav>
      {panel === 'details' && (
      <>
        <ShortsJourney video={video} busy={s.busy} publish={() => s.publish(video.id)} />
        <section className="ss-panel ss-video-detail">
          <div>
            <h2>Video details</h2>
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
            <ShortsGuidelines video={video} />
            <div className="ss-action-row">
              <button type="button" disabled={s.busy} onClick={() => s.reviewClip(video.id)}>Load private preview</button>
            </div>
            <details>
              <summary>Storage details</summary>
              <p>Published content CID</p>
              <code>{video.cid}</code>
            </details>
            <small>
              This CID identifies the immutable content published for your Short.
              Upload a new revision to change the video or its captions.
            </small>
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
      </>
      )}
      {panel === 'analytics' && <Analytics s={s} />}
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
      <p>Review feed eligibility using the actual video, rights, disclosures and reports. These decisions control visibility in the feed.</p>
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
  const [params] = useSearchParams();
  const layout = useRef<HTMLDivElement>(null);
  useEffect(() => { layout.current?.scrollIntoView?.({ block: 'start', behavior: 'instant' }); }, [page, s.videoId]);
  const accessError = s.configError || (s.actor && !s.authenticated ? s.releaseError : '');
  const signInLabel = s.creatorConnectionError ? 'Try again' : 'Open Studio';
  const loading = page !== 'upload' && !accessError && (s.restoringCreatorSession || (s.authenticated && !s.dashboard && !s.dashboardError));
  const index = page === 'video' && s.config?.studioPaging ? s.studioVideo.data?.index : s.dashboard?.index;
  if (page === 'revenue') return <Navigate to="/shorts/studio" replace />;
  const titles: Record<string, string> = {
    overview: 'Overview', content: 'Content', analytics: 'Analytics', upload: 'Create a Short', video: 'Short details', review: 'Review & safety',
  };
  if (page === 'video') titles.video = { analytics: 'Short analytics' }[params.get('panel') || ''] || 'Short details';
  return (
    <div ref={layout} className={`ss-layout ss-page-${page}`}>
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
            ['', 'Overview', LayoutDashboard], ['/content', 'Content', Clapperboard], ['/analytics', 'Analytics', BarChart3], ['/upload', 'Create Short', Plus], ...(s.isOperator ? [['/review', 'Moderation', ShieldCheck]] : []),
          ].map(([path, label, Icon]) => {
            const Glyph = Icon as typeof Plus; return (
              <NavLink key={String(path)} onClick={s.clearMessage} end to={`/shorts/studio${path}`} className={({ isActive }) => (isActive || (path === '/content' && page === 'video') ? 'selected' : '')}>
                <Glyph size={19} />
                {String(label)}
              </NavLink>
            );
          })}
        </nav>
        <section className="ss-sidebar-account" aria-label="Your Superhero wallet">
          <HeaderWalletButton />
          {s.actor && <span className="ss-wallet-address">{s.actor}</span>}
        </section>
      </aside>
      <main className="ss-main">
        {page !== 'upload' && (
        <header className="ss-header">
          <div>
            <h1>{titles[page] || 'Creator Studio'}</h1>
          </div>
          <div className="ss-header-actions">
            {['overview', 'content'].includes(page) && (
            <Link className="ss-button primary" to="/shorts/studio/upload">
              <Plus size={17} />
              Create Short
            </Link>
            )}
            {(s.authenticated || s.restoringCreatorSession) && (
            <button type="button" className="ss-refresh" disabled={s.busy || loading} onClick={s.refreshNow} aria-label="Refresh Studio" title="Refresh Studio">
              <RefreshCw size={19} aria-hidden="true" />
            </button>
            )}
          </div>
        </header>
        )}
        {accessError && (
        <div className="ss-panel ss-data-error" role="alert">
          <div>
            <h2>Studio is temporarily unavailable</h2>
            <p>{accessError}</p>
          </div>
          <button type="button" disabled={s.busy} onClick={s.refreshNow}>Try again</button>
        </div>
        )}
        {!accessError && !s.authenticated && !s.restoringCreatorSession && page !== 'upload' ? (
          <div className="ss-welcome ss-panel">
            <BarChart3 size={45} />
            <h2>{page === 'content' ? 'Your content, all in one place' : 'Welcome to your creator space'}</h2>
            <p>{page === 'content' ? 'Find your uploads, check their status and manage each Short.' : 'See your latest Shorts and audience activity here.'}</p>
            {s.actor ? (
              <>
                {s.config?.creatorAccess === 'signed-session' && <p className="ss-access-note">Your wallet is connected. Approve a sign-in message to open your private Studio. This does not send a transaction or charge a fee.</p>}
                {s.creatorConnectionError && <small role="alert">{s.creatorConnectionError}</small>}
                <button type="button" className="primary" disabled={s.busy} onClick={s.signIn}>{s.walletPending ? 'Waiting for wallet…' : signInLabel}</button>
              </>
            ) : <p>Connect using the wallet button in the Studio navigation to see your account.</p>}
          </div>
        ) : null}
        {s.authenticated && s.dashboardError && !accessError && page !== 'upload' && <DataError message={s.dashboardError} retry={s.refreshNow} />}
        {s.authenticated && index?.stale && page !== 'upload' && page !== 'content' && <p className="ss-measurement-note" role="status">Publication status and Likes are catching up with the network.</p>}
        {loading && <StudioSkeleton page={page} label={s.restoringCreatorSession ? 'Opening your Studio…' : 'Loading your Studio…'} />}
        {page === 'upload' && <ShortsUpload key={s.uploadEpoch} s={s} />}
        {s.authenticated && s.dashboard && !loading && (
          <>
            {page === 'overview' && (
            <>
              <Analytics s={s} compact />
              <div className="ss-overview-grid">
                <Content s={s} compact />
                <NextSteps s={s} />
              </div>
            </>
            )}
            {page === 'content' && <Content s={s} />}
            {page === 'analytics' && <Analytics s={s} />}
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
