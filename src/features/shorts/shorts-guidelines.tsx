import { ShieldCheck } from 'lucide-react';
import type { Short } from './types';

export const publicationStatus = (video: Short): NonNullable<Short['publicationStatus']> => {
  if (video.publicationStatus) return video.publicationStatus;
  if (video.status === 'withdrawn') return 'withdrawn';
  return video.status === 'active' ? 'published' : 'draft';
};
export const guidelinesStatus = (video: Short): NonNullable<Short['guidelines']>['status'] => {
  if (video.guidelines) return video.guidelines.status;
  if (video.moderation === 'rejected') return 'ineligible';
  if (['ready', 'active'].includes(video.status)) return 'eligible';
  return 'analyzing';
};
const messages = {
  analyzing: ['Analyzing your video', 'We’re checking your video against our community guidelines for the Superhero feed.'],
  reviewing: ['Under review', 'Our team is reviewing your video before it can appear in the Superhero feed.'],
  eligible: ['Eligible for the feed', 'Your video meets our community guidelines. It can appear in the feed once published.'],
  ineligible: ['Not eligible for the feed', 'This video won’t appear in the Superhero feed. You can request another review below.'],
  unavailable: ['Not in feed', ''],
};
export const feedLabel = (video: Short) => messages[guidelinesStatus(video)][0];

export const ShortsGuidelines = ({ video }: { video: Short }) => {
  const status = guidelinesStatus(video);
  if (status === 'unavailable' || video.guidelines?.approval === 'demo') return null;
  const [title, description] = messages[status];
  return (
    <section className={`ss-guidelines ss-guidelines--${status}`} aria-label="Community guidelines">
      <div className="ss-guidelines-heading">
        <span className="ss-guidelines-icon"><ShieldCheck size={19} aria-hidden="true" /></span>
        <div>
          <span className="sh-eyebrow">COMMUNITY GUIDELINES</span>
          <h3>{title}</h3>
        </div>
      </div>
      <p>{description}</p>
      {status === 'ineligible' && video.guidelines?.reason && <p className="ss-guidelines-reason">{video.guidelines.reason}</p>}
    </section>
  );
};
