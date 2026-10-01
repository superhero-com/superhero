import { useLayoutEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Heart, Info, X,
} from 'lucide-react';
import { ShortsDialog } from './shorts-dialog';
import supportHeart from './assets/support-heart.png';
import './shorts-like-dialog.css';

interface Props {
  title: string;
  connected: boolean;
  busy: boolean;
  walletPending: boolean;
  error?: string;
  onClose: () => void;
  onLike: () => void;
  onConnect: () => void;
}

export const ShortsLikeDialog = ({
  title, connected, busy, walletPending, error, onClose, onLike, onConnect,
}: Props) => {
  const [feesOpen, setFeesOpen] = useState(false);
  const infoButton = useRef<HTMLButtonElement>(null);
  const restoreInfoFocus = useRef(false);
  const closeFees = () => {
    restoreInfoFocus.current = true;
    setFeesOpen(false);
  };
  useLayoutEffect(() => {
    if (!feesOpen && restoreInfoFocus.current) {
      infoButton.current?.focus();
      restoreInfoFocus.current = false;
    }
  }, [feesOpen]);
  let action = connected ? 'Send a Like · 0.1 test AE' : 'Connect wallet to Like';
  if (busy) action = 'Waiting for wallet & network…';

  return (
    <>
      <ShortsDialog label="Support this creator" busy={busy} suspended={walletPending || feesOpen} onClose={onClose}>
        <section className="sh-modal sh-support">
          <button type="button" className="sh-support-close" aria-label="Close support dialog" disabled={busy} onClick={onClose}>
            <X size={19} aria-hidden="true" />
          </button>
          <div className="sh-support-art" aria-hidden="true">
            <div className="sh-support-halo" />
            <img src={supportHeart} width="1280" height="1280" alt="" draggable="false" />
          </div>
          <span className="sh-eyebrow">MAKE THEIR DAY</span>
          <h2>
            A little love goes
            <br />
            a long way.
          </h2>
          <p className="sh-support-copy">Loved this Short? Send a Like to show your appreciation and support the person behind it.</p>
          <div className="sh-support-video">
            <Heart size={16} aria-hidden="true" />
            <span>{title}</span>
          </div>
          {error && <p className="sh-support-error" role="alert">{error}</p>}
          <div className="sh-support-price">
            <span>
              One Like
              <strong>0.1 test AE</strong>
            </span>
            <button
              ref={infoButton}
              type="button"
              className="sh-support-info"
              aria-label="How the Like fee is split"
              aria-haspopup="dialog"
              disabled={busy}
              onClick={() => setFeesOpen(true)}
            >
              <Info size={18} aria-hidden="true" />
            </button>
          </div>
          <button type="button" className="primary sh-support-action" disabled={busy} onClick={connected ? onLike : onConnect}>
            <Heart size={18} aria-hidden="true" />
            {action}
          </button>
          <p className="sh-support-note">Plus network fee · Confirm in your wallet</p>
        </section>
      </ShortsDialog>
      {feesOpen && (
        <ShortsDialog label="How your Like is shared" busy={false} onClose={closeFees}>
          <section className="sh-modal sh-support-fees">
            <button type="button" className="sh-support-close" aria-label="Close fee details" onClick={closeFees}>
              <X size={19} aria-hidden="true" />
            </button>
            <span className="sh-support-fee-icon" aria-hidden="true"><Heart size={26} /></span>
            <span className="sh-eyebrow">A LITTLE SUPPORT, SHARED</span>
            <h2>Where your Like goes</h2>
            <p>Each 0.1 test AE Like supports the creator and Superhero.</p>
            <div className="sh-support-split" aria-hidden="true">
              <span />
              <span />
            </div>
            <dl className="sh-support-shares">
              <div>
                <dt>
                  Creator
                  <span>80%</span>
                </dt>
                <dd>0.08 test AE</dd>
              </div>
              <div>
                <dt>
                  Superhero treasury
                  <span>20%</span>
                </dt>
                <dd>0.02 test AE</dd>
              </div>
            </dl>
            <p>The creator can claim their rewards or use them to keep their Shorts hosted.</p>
            <div className="sh-support-fee-note">
              <strong>Network fee is separate</strong>
              <p>Your wallet shows the additional fee before you confirm. It goes to the network and is not part of the split.</p>
            </div>
            <p className="sh-support-terms">One paid Like per wallet per Short. Confirmed payments are final. This preview uses test AE.</p>
            <button type="button" className="sh-support-back" onClick={closeFees}>
              <ArrowLeft size={17} aria-hidden="true" />
              {' '}
              Back to supporting
            </button>
          </section>
        </ShortsDialog>
      )}
    </>
  );
};
