import { Link } from 'react-router-dom';
import { EyeOff } from 'lucide-react';

type Props = { warning: 'feed-excluded' | 'unreviewed'; posterUrl: string; onReveal: () => void };
export const ShortsContentWarning = ({ warning, posterUrl, onReveal }: Props) => (
  <div className="sv-content-warning">
    <img className="sv-warning-poster" src={posterUrl} alt="" aria-hidden="true" />
    <div className="sv-warning-content">
      <span className="sv-warning-icon"><EyeOff size={27} aria-hidden="true" /></span>
      <span className="sv-warning-kicker">SHARED VIDEO</span>
      <h2>{warning === 'feed-excluded' ? 'Not eligible for the feed' : 'This video is under review'}</h2>
      <p>{warning === 'feed-excluded' ? 'This video didn’t meet our community guidelines for the feed. Its content is blurred so you can choose whether to watch.' : 'Community-guidelines checks aren’t complete. Its content is blurred until you choose to watch.'}</p>
      <button type="button" className="sv-warning-reveal" onClick={onReveal}>View video</button>
      <Link to="/shorts">Back to Shorts</Link>
      <small>Shared by its creator. Hosted videos may be available by link without appearing in the feed.</small>
    </div>
  </div>
);
