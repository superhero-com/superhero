import { Heart, X } from 'lucide-react';
import { ShortsDialog } from './shorts-dialog';
import supportHeart from './assets/support-heart.png';
import './shorts-like-dialog.css';
import { shortsPricing, type ShortsPricing } from './shorts-pricing';

interface Props {
  title: string;
  pricing?: ShortsPricing;
  connected: boolean;
  busy: boolean;
  walletPending: boolean;
  error?: string;
  onClose: () => void;
  onLike: () => void;
  onConnect: () => void;
}

export const ShortsLikeDialog = ({
  title, pricing, connected, busy, walletPending, error, onClose, onLike, onConnect,
}: Props) => {
  const available = !!shortsPricing(pricing);
  let action = available ? 'Like' : 'Likes temporarily unavailable';
  if (!connected) action = 'Connect wallet to Like';
  if (busy) action = 'Waiting for wallet & network…';
  return (
    <ShortsDialog label="Like this Short" busy={busy} suspended={walletPending} onClose={onClose}>
      <section className="sh-modal sh-support">
        <button type="button" className="sh-support-close" aria-label="Close Like dialog" disabled={busy} onClick={onClose}>
          <X size={19} aria-hidden="true" />
        </button>
        <div className="sh-support-art" aria-hidden="true">
          <div className="sh-support-halo" />
          <img src={supportHeart} width="1280" height="1280" alt="" draggable="false" />
        </div>
        <span className="sh-eyebrow">MAKE THEIR DAY</span>
        <h2>Like this Short</h2>
        <p className="sh-support-copy">Show the creator you enjoyed it. Likes are free.</p>
        <div className="sh-support-video">
          <Heart size={16} aria-hidden="true" />
          <span>{title}</span>
        </div>
        {error && <p className="sh-support-error" role="alert">{error}</p>}
        <button type="button" className="primary sh-support-action" disabled={busy || (connected && !available)} onClick={connected ? onLike : onConnect}>
          <Heart size={18} aria-hidden="true" />
          {action}
        </button>
        <p className="sh-support-note">
          {available ? 'Superhero covers the network fee. Confirm the Like in your wallet.' : 'Network fee sponsorship is temporarily unavailable.'}
        </p>
      </section>
    </ShortsDialog>
  );
};
