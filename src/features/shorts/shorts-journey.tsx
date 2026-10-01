import { Link } from 'react-router-dom';
import type { Short } from './types';
import { guidelinesStatus, hostingStatus } from './shorts-guidelines';

type Props = { video: Short; busy: boolean; fund: () => void };
export const ShortsJourney = ({ video, busy, fund }: Props) => {
  const hosting = hostingStatus(video);
  const hosted = hosting === 'active';
  const eligible = guidelinesStatus(video) === 'eligible';
  const live = hosted && eligible;
  const copy: Record<string, [string, string]> = {
    unfunded: ['Your upload is ready', 'Choose prepaid hosting for your video. Community-guidelines checks decide whether it can appear in the feed.'],
    active: [live ? 'Your Short is live' : 'Your video is hosted', 'Your hosting coverage is active. You can extend it with wallet funds or earned rewards.'],
    expired: ['Extend your hosting', 'Your coverage has expired. Add hosting days to restore your video’s coverage.'],
    withdrawn: ['This Short was withdrawn', 'It is no longer hosted by Superhero. Create another Short to start again.'],
  };
  const [title, description] = copy[hosting];
  return (
    <section className="ss-journey" aria-label="Your Short’s status">
      <ol>
        <li className="complete">
          <span>✓</span>
          Uploaded
        </li>
        <li className={hosted ? 'complete' : 'current'}>
          <span>2</span>
          {hosted ? 'Hosting active' : 'Hosting coverage'}
        </li>
        <li className={eligible ? 'complete' : ''}>
          <span>3</span>
          {eligible ? 'Feed eligible' : 'Feed review'}
        </li>
      </ol>
      <div className="ss-journey-body">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <div className="ss-action-row">
          {hosted && <Link className="ss-button primary" to={`/shorts?short=${video.id}`}>Watch & share</Link>}
          {hosting !== 'withdrawn' && <button type="button" className={hosted ? '' : 'primary'} disabled={busy} onClick={fund}>{video.until ? 'Extend hosting' : 'Choose hosting'}</button>}
          {hosting === 'withdrawn' && <Link className="ss-button primary" to="/shorts/studio/upload">Create another Short</Link>}
        </div>
      </div>
    </section>
  );
};
