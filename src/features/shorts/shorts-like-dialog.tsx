import { useEffect, useRef } from 'react';
import { Heart, HeartCrack, LoaderCircle } from 'lucide-react';
import { ShortsDialog } from './shorts-dialog';
import type { LikePhase } from './shorts-like-feedback';
import supportHeart from './assets/support-heart.png';
import './shorts-like-dialog.css';

interface Props {
  title: string;
  phase: LikePhase;
  onClose: () => void;
}

/** Visual feedback only. The originating heart click owns the wallet request. */
export const ShortsLikeDialog = ({ title, phase, onClose }: Props) => {
  const close = useRef(onClose);
  close.current = onClose;
  const failed = phase === 'cancelled' || phase === 'error';
  useEffect(() => {
    if (!failed) return undefined;
    const timer = setTimeout(() => close.current(), 1800);
    return () => clearTimeout(timer);
  }, [phase, failed]);
  const heading = {
    connecting: 'Connect your wallet',
    signing: 'A little love goes a long way',
    cancelled: 'Like cancelled',
    error: 'Like couldn’t be sent',
  }[phase];
  const detail = {
    connecting: 'Your wallet will open automatically.',
    signing: 'Confirm the Like in your wallet.',
    cancelled: 'No Like was added.',
    error: 'No Like was added.',
  }[phase];
  return (
    <ShortsDialog label="Like this Short" busy={!failed} suspended keepVisibleWhenSuspended onClose={onClose} className="sh-like-feedback">
      <section className={`sh-modal sh-support is-${phase}`}>
        <div className="sh-support-art" aria-hidden="true">
          <div className="sh-support-halo" />
          <div className="sh-support-orbit" />
          <img src={supportHeart} width="1280" height="1280" alt="" draggable="false" />
          {failed && <span className="sh-support-cancel-mark"><HeartCrack size={30} /></span>}
        </div>
        <span className="sh-eyebrow">{failed ? 'MAYBE NEXT TIME' : 'MAKE THEIR DAY'}</span>
        <div role="status" aria-live="polite" aria-atomic="true">
          <h2>{heading}</h2>
          <p className="sh-support-copy">
            {detail}
          </p>
        </div>
        <div className="sh-support-video">
          <Heart size={16} aria-hidden="true" />
          <span>{title}</span>
        </div>
        {!failed && (
          <p className="sh-support-note">
            <LoaderCircle size={15} aria-hidden="true" />
            Superhero covers the network fee.
          </p>
        )}
      </section>
    </ShortsDialog>
  );
};
