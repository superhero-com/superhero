import { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2, ChevronDown, Clock3, Globe2, Hash, Info, LoaderCircle, Megaphone,
  Pencil, ShieldCheck, Sparkles, TriangleAlert,
} from 'lucide-react';
import type { useShorts } from './use-shorts';
import type { Short } from './types';

type State = ReturnType<typeof useShorts>;
export const UploadReview = ({
  video, languageLabel, busy, onEdit,
}: {
  video: Pick<Short, 'title' | 'description' | 'topic' | 'synthetic' | 'sponsored'>;
  languageLabel: string; busy: boolean; onEdit: () => void;
}) => (
  <div className="su-review">
    <section className="su-review-short" aria-label="Your Short">
      <div className="su-review-heading">
        <span>THE DETAILS</span>
        <button type="button" disabled={busy} onClick={onEdit}>
          <Pencil size={14} aria-hidden="true" />
          Edit details
        </button>
      </div>
      <h3>{video.title}</h3>
      {video.description && <p className="su-description">{video.description}</p>}
      <dl className="su-review-facts">
        <div>
          <dt>
            <Hash size={14} aria-hidden="true" />
            Topic
          </dt>
          <dd>{video.topic}</dd>
        </div>
        <div>
          <dt>
            <Globe2 size={14} aria-hidden="true" />
            Language
          </dt>
          <dd>{languageLabel}</dd>
        </div>
      </dl>
      {(video.synthetic || video.sponsored) && (
      <div className="su-tags">
        {video.synthetic && (
        <span>
          <Sparkles size={13} aria-hidden="true" />
          AI-altered
        </span>
        )}
        {video.sponsored && (
        <span>
          <Megaphone size={13} aria-hidden="true" />
          Sponsored
        </span>
        )}
      </div>
      )}
    </section>
    <div className="su-review-ready">
      <ShieldCheck size={22} aria-hidden="true" />
      <div>
        <strong>Ready when you are.</strong>
        <span>Rights confirmed · Free to publish</span>
      </div>
    </div>
    <div className="su-review-help">
      <details>
        <summary>
          <Info size={15} aria-hidden="true" />
          About publishing
          <ChevronDown size={15} className="su-info-chevron" aria-hidden="true" />
        </summary>
        <div>
          <p>Publishing is free. Superhero covers storage and publishing costs.</p>
          <p>
            Your share link is ready after publication. Playback may take a little longer.
            Manage your Short in Studio.
          </p>
        </div>
      </details>
    </div>
  </div>
);

export const UploadPublishOverlay = ({ s }: { s: State }) => {
  const publication = s.uploadPublication!;
  const done = publication.status === 'published';
  const failed = publication.status === 'error';
  const reviewing = publication.status === 'reviewing';
  const publishing = publication.status === 'publishing';
  let phase = s.uploadStage === 'processing' ? 1 : 0;
  if (publication.status === 'publishing' || publication.shortId) phase = 2;
  if (done) phase = 3;
  const heading = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    heading.current?.focus();
    return () => { requestAnimationFrame(() => { if (previous?.isConnected) previous.focus(); }); };
  }, []);
  let StatusIcon = LoaderCircle;
  if (done) StatusIcon = CheckCircle2;
  if (failed) StatusIcon = TriangleAlert;
  if (reviewing) StatusIcon = Clock3;
  const titles = ['Uploading your video', 'Preparing your Short', 'Publishing your Short'];
  let title = titles[phase];
  let copy = 'We’re taking care of the rest. Keep this page open.';
  if (publishing) copy = 'Your upload is saved. We’re confirming publication. You can check progress in Studio.';
  if (done) { title = 'Your Short is published.'; copy = 'Your link is ready to share. Playback may still be preparing.'; }
  if (failed) { title = 'Let’s try that again'; copy = 'Your details are saved. Retry to continue from where we left off.'; }
  if (reviewing) { title = 'Your Short is awaiting review'; copy = 'Your upload is saved. It will stay private until approved. You can check its status in Studio.'; }
  const stageStatus = (index: number) => {
    if (index < phase) return 'Done';
    if (index > phase) return 'Next';
    if (reviewing) return 'Awaiting review';
    return failed ? 'Try again' : 'In progress';
  };
  return (
    <section className="su-publish-overlay" aria-label="Publishing your Short">
      <div className={`su-publish-content ${done ? 'is-live' : ''}`}>
        <div className="su-publish-art" aria-hidden="true">
          <StatusIcon className={!done && !failed && !reviewing ? 'su-publish-spinner' : undefined} size={40} />
        </div>
        <div role="status" aria-atomic="true">
          <h2 ref={heading} tabIndex={-1}>{title}</h2>
          <p>{copy}</p>
          {!done && !failed && s.uploadStage === 'uploading' && <progress aria-label="Video upload" max={100} value={s.uploadProgress} />}
          {failed && s.message && <p role="alert">{s.message}</p>}
        </div>
        <ol className="su-publish-steps" aria-label="Publishing progress">
          {['Upload video', 'Prepare video', 'Publish'].map((label, index) => (
            <li key={label} className={index < phase ? 'complete' : ''} aria-current={index === phase ? 'step' : undefined}>
              <span className="su-publish-step-icon" aria-hidden="true">{index < phase ? <CheckCircle2 size={19} /> : index + 1}</span>
              <span>{label}</span>
              <small>{stageStatus(index)}</small>
            </li>
          ))}
        </ol>
        {(done || failed || reviewing || (publishing && publication.shortId)) && (
          <div className="su-publish-actions">
            {done && <Link className="ss-button primary" to={`/shorts?short=${publication.shortId}`}>Watch &amp; share</Link>}
            {publication.shortId && <Link className="ss-button" to={`/shorts/studio/video/${publication.shortId}`}>View in Studio</Link>}
            {failed && <button type="button" disabled={s.busy} onClick={s.resetUpload}>Start a new upload</button>}
            {(failed || reviewing) && <button type="button" disabled={s.busy} onClick={s.dismissPublication}>Back to review</button>}
            {done && <button type="button" disabled={s.busy} onClick={s.resetUpload}>Create another Short</button>}
          </div>
        )}
      </div>
    </section>
  );
};
