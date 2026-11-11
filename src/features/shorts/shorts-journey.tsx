import { Link } from 'react-router-dom';
import type { Short } from './types';
import { guidelinesStatus, publicationStatus } from './shorts-guidelines';

type Props = { video: Short; busy: boolean; publish: () => void };
export const ShortsJourney = ({ video, busy, publish }: Props) => {
  const status = publicationStatus(video);
  const live = status === 'published';
  const eligible = guidelinesStatus(video) === 'eligible';
  let title = 'Your upload is ready';
  let description = 'Publish your Short whenever you’re ready. Superhero covers storage.';
  if (live) { title = eligible ? 'Your Short is live' : 'Your Short is published'; description = 'Share your story and see how it connects with your audience.'; }
  if (status === 'withdrawn') { title = 'This Short was withdrawn'; description = 'Create another Short to share a new moment.'; }
  return (
    <section className="ss-journey" aria-label="Your Short’s status">
      <div className="ss-journey-body">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <div className="ss-action-row">
          {live && <Link className="ss-button primary" to={`/shorts?short=${video.id}`}>Watch &amp; share</Link>}
          {status === 'draft' && <button type="button" className="primary" disabled={busy} onClick={publish}>Publish</button>}
          {status === 'withdrawn' && <Link className="ss-button primary" to="/shorts/studio/upload">Create another Short</Link>}
        </div>
      </div>
    </section>
  );
};
