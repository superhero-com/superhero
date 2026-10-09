import { useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowDown, ArrowUp, ArrowUpRight, BarChart3, Clapperboard, Search,
} from 'lucide-react';
import { shortsMediaUrl } from './shorts-media';
import { feedLabel, guidelinesStatus, publicationStatus } from './shorts-guidelines';
import type { useShorts } from './use-shorts';

const states = [['all', 'All Shorts'], ['published', 'Published'], ['draft', 'Drafts'], ['withdrawn', 'Withdrawn']];
const PAGE_SIZE = 10;

export const StudioContent = ({ s, compact = false }: { s: ReturnType<typeof useShorts>; compact?: boolean }) => {
  const [params, setParams] = useSearchParams();
  const library = useRef<HTMLElement>(null);
  const viewsAvailable = !!s.performance && !s.performanceError;
  const search = compact ? '' : params.get('q') || '';
  const status = !compact && states.some(([value]) => value === params.get('status')) ? params.get('status')! : 'all';
  const requestedSort = compact ? 'newest' : params.get('sort') || 'newest';
  const validSort = ['newest', 'oldest', 'likes', 'likes-asc', 'views', 'views-asc'].includes(requestedSort)
    && (!requestedSort.startsWith('views') || viewsAvailable);
  const sort = validSort ? requestedSort : 'newest';
  const videos = s.dashboard?.shorts || [];
  const rows = videos.filter((v) => (status === 'all' || publicationStatus(v) === status)
    && `${v.title} ${v.topic}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => {
      if (sort.startsWith('likes')) return (b.likes - a.likes) * (sort === 'likes-asc' ? -1 : 1);
      if (sort.startsWith('views') && viewsAvailable) return ((s.performance?.videos[b.id]?.views ?? 0) - (s.performance?.videos[a.id]?.views ?? 0)) * (sort === 'views-asc' ? -1 : 1);
      return sort === 'oldest' ? (a.createdAt || 0) - (b.createdAt || 0) : (b.createdAt || 0) - (a.createdAt || 0);
    });
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const requestedPage = Number(params.get('page'));
  const page = compact || !Number.isSafeInteger(requestedPage) ? 1 : Math.min(pageCount, Math.max(1, requestedPage));
  const shown = compact ? rows.slice(0, 4) : rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
    if (key === 'page') library.current?.scrollIntoView?.({ block: 'start', behavior: 'instant' });
  };
  const reset = () => setParams({}, { replace: true });
  const sortDirection = (descending: string, ascending: string) => {
    if (compact) return 'none';
    if (sort === descending) return 'descending';
    if (sort === ascending) return 'ascending';
    return 'none';
  };
  return (
    <section ref={library} className={`ss-panel ss-library ${compact ? 'ss-library--compact' : 'ss-library--full'}`} aria-label={compact ? 'Latest Shorts' : 'Content library'}>
      {compact && (
      <div className="sh-section-head">
        <h2>Latest Shorts</h2>
        <Link className="ss-text-link" to="/shorts/studio/content">
          View all
          <ArrowUpRight size={15} />
        </Link>
      </div>
      )}
      {!compact && (
        <>
          <div className="ss-status-filters ss-content-tabs" role="group" aria-label="Publication status">
            {states.map(([value, label]) => (
              <button type="button" key={value} aria-pressed={status === value} onClick={() => update('status', value)}>
                {label}
                {' '}
                <span>{value === 'all' ? videos.length : videos.filter((v) => publicationStatus(v) === value).length}</span>
              </button>
            ))}
          </div>
          <div className="ss-library-tools">
            <label className="ss-search" htmlFor="studio-search">
              <Search size={17} aria-hidden="true" />
              <input id="studio-search" aria-label="Search your Shorts" value={search} placeholder="Search title or topic" onChange={(e) => update('q', e.target.value)} />
            </label>
            <label className="ss-select ss-sort-select" htmlFor="studio-sort">
              Sort by
              <select id="studio-sort" value={sort} onChange={(e) => update('sort', e.target.value)}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="likes">Most paid Likes</option>
                <option value="likes-asc">Fewest paid Likes</option>
                <option value="views" disabled={!viewsAvailable}>Most views</option>
                <option value="views-asc" disabled={!viewsAvailable}>Fewest views</option>
              </select>
            </label>
            <label className="ss-select" htmlFor="studio-content-period">
              Views period
              <select id="studio-content-period" value={s.days} onChange={(e) => s.setDays(Number(e.target.value))}>{[7, 28, 90].map((days) => <option key={days} value={days}>{`Last ${days} days`}</option>)}</select>
            </label>
          </div>
          {s.performanceError && (
          <p className="ss-inline-error" role="alert">
            Views are unavailable. Your content is still here.
            <button type="button" onClick={s.refreshPerformance}>Retry views</button>
          </p>
          )}
        </>
      )}
      {shown.length > 0 ? (
        <div className="ss-table-wrap ss-responsive-table">
          <table className="ss-content-table">
            <thead>
              <tr>
                <th scope="col">Short</th>
                <th scope="col">Status</th>
                {!compact && (
                <th scope="col" aria-sort={sortDirection('newest', 'oldest')}>
                  <button type="button" className="ss-sort-heading" onClick={() => update('sort', sort === 'newest' ? 'oldest' : 'newest')}>
                    Date
                    {sort === 'newest' && <ArrowDown size={13} />}
                    {sort === 'oldest' && <ArrowUp size={13} />}
                  </button>
                </th>
                )}
                <th scope="col" className="ss-number-cell" aria-sort={sortDirection('views', 'views-asc')}>
                  {compact ? 'Views' : (
                    <button type="button" className="ss-sort-heading" disabled={!viewsAvailable} onClick={() => update('sort', sort === 'views' ? 'views-asc' : 'views')}>
                      Views
                      {sort === 'views' && <ArrowDown size={13} />}
                      {sort === 'views-asc' && <ArrowUp size={13} />}
                    </button>
                  )}
                  <small className="ss-cell-note">{`Last ${s.days} days`}</small>
                </th>
                <th scope="col" className="ss-number-cell" aria-sort={sortDirection('likes', 'likes-asc')}>
                  {compact ? 'Paid Likes' : (
                    <button type="button" className="ss-sort-heading" onClick={() => update('sort', sort === 'likes' ? 'likes-asc' : 'likes')}>
                      Paid Likes
                      {sort === 'likes' && <ArrowDown size={13} />}
                      {sort === 'likes-asc' && <ArrowUp size={13} />}
                    </button>
                  )}
                  <small className="ss-cell-note">All time</small>
                </th>
                {!compact && <th scope="col">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {shown.map((v) => {
                const published = publicationStatus(v);
                const path = `/shorts/studio/video/${encodeURIComponent(v.id)}`;
                let visibility = feedLabel(v);
                if (v.status === 'active') visibility = 'In the feed';
                if (published === 'draft') visibility = 'Only you can see this';
                if (published === 'withdrawn') visibility = 'Removed from the feed';
                return (
                  <tr key={v.id}>
                    <td className="ss-content-identity">
                      <Link className="ss-video-title" to={path}>
                        {v.status === 'active' ? <img src={shortsMediaUrl(v.id, 'poster.jpg')} alt="" loading="lazy" /> : <span className="ss-thumbnail"><Clapperboard size={21} /></span>}
                        <span>
                          <b>{v.title}</b>
                          <small>
                            {`${v.topic} · ${Math.round(v.duration)}s`}
                            {!compact && v.createdAt ? <span className="ss-content-date-inline">{` · ${new Date(v.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium', timeZone: 'UTC' })}`}</span> : null}
                          </small>
                        </span>
                      </Link>
                    </td>
                    <td className="ss-content-status">
                      <span className={`ss-pill ${published}`}>{{ published: 'Published', draft: 'Draft', withdrawn: 'Withdrawn' }[published]}</span>
                      <small className="ss-cell-note">{visibility}</small>
                      {published !== 'withdrawn' && guidelinesStatus(v) === 'ineligible' && <Link className="ss-text-link" to={path}>Review issue</Link>}
                    </td>
                    {!compact && (
                    <td className="ss-content-date">
                      {v.createdAt ? new Date(v.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium', timeZone: 'UTC' }) : '—'}
                      <small className="ss-cell-note">Uploaded</small>
                    </td>
                    )}
                    <td className="ss-content-views ss-number-cell" data-label={`Views · ${s.days} days`}>{viewsAvailable ? (s.performance?.videos[v.id]?.views ?? 0).toLocaleString() : '—'}</td>
                    <td className="ss-content-likes ss-number-cell" data-label="Paid Likes · all time">{v.likes.toLocaleString()}</td>
                    {!compact && (
                    <td className="ss-content-actions">
                      <div>
                        <Link className="ss-text-link" aria-label={`Analytics for ${v.title}`} to={`${path}?panel=analytics`}>
                          <BarChart3 size={15} />
                          Analytics
                        </Link>
                        <Link className="ss-text-link" aria-label={`Manage ${v.title}`} to={path}>
                          Manage
                          <ArrowUpRight size={14} />
                        </Link>
                        {published === 'published' && <Link className="ss-text-link" aria-label={`Watch ${v.title}`} to={`/shorts?short=${encodeURIComponent(v.id)}`}>Watch</Link>}
                      </div>
                    </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="ss-empty">
          <Clapperboard size={30} />
          <h3>{search || status !== 'all' ? 'No matching Shorts' : 'Your next idea belongs here'}</h3>
          <p>{search || status !== 'all' ? 'Try another search or show all your Shorts.' : 'Upload your first video. Superhero covers hosting.'}</p>
          {search || status !== 'all' ? <button type="button" onClick={reset}>Clear filters</button> : <Link className="ss-button primary" to="/shorts/studio/upload">Create your first Short</Link>}
        </div>
      )}
      {!compact && rows.length > 0 && (
      <div className="ss-pagination">
        <span>{`${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, rows.length)} of ${rows.length} Shorts`}</span>
        {pageCount > 1 && (
        <div>
          <button type="button" disabled={page === 1} onClick={() => update('page', String(page - 1))}>Previous</button>
          <span>{`${page} / ${pageCount}`}</span>
          <button type="button" disabled={page === pageCount} onClick={() => update('page', String(page + 1))}>Next</button>
        </div>
        )}
      </div>
      )}
      {!compact && <p className="ss-table-note">Views cover the selected period. Paid Likes include all time.</p>}
    </section>
  );
};
