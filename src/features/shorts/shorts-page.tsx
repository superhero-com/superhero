import { ShortsStudio } from './shorts-studio';
import { useShorts } from './use-shorts';
import { ShortsComments } from './shorts-comments';
import { ShortsDialog } from './shorts-dialog';
import { ShortsLikeDialog } from './shorts-like-dialog';
import { ShortsViewer } from './shorts-viewer';
import { ShortsWalletRecovery } from './shorts-wallet-recovery';
import { shortsUnit } from './shorts-pricing';
import './shorts.css';
import './shorts-viewer.css';

export const ShortsPage = () => {
  const s = useShorts();
  const { walletRecovery } = s;
  const pending = walletRecovery.action;
  const unsent = pending && (!pending.tx || pending.submission === 'prepared');
  const retryLike = pending?.submission === 'attempted' && pending.sponsorship && pending.rawInner
    && walletRecovery.observation?.status === 'unknown'
    && !walletRecovery.observation.sponsorshipStatus;
  return (
    <div className={`shorts-app ${s.tab === 'feed' ? 'shorts-watching' : 'shorts-studio-page'}`}>
      <ShortsWalletRecovery recovery={s.walletRecovery} message={s.message} messageTone={s.messageTone} scope={s.notificationScope} />
      {s.tab === 'feed' ? (
        <ShortsViewer
          feed={s.feed}
          pricing={s.paymentRelease}
          topics={s.config?.topics || []}
          topic={s.topic}
          onTopic={s.setTopic}
          onLike={s.startLike}
          onComments={s.config?.release?.schemaVersion === 2 ? s.setCommentShort : undefined}
          onReport={s.report}
          personal={s.personal}
          social={s.social}
          onConnect={s.connectWallet}
          onPlayback={s.playback}
          measurementSession={s.measurementSession}
          onStudio={() => s.setTab('studio')}
          onUpload={() => s.setTab('publish')}
          loadError={s.feedError}
          onRetry={s.retryFeed}
          busy={s.busy}
          suspended={!!s.like || !!s.commentShort || walletRecovery.blocked || s.busy}
          ready={s.feedReady}
          shared={s.shared}
          pagination={s.config?.catalogPaging && !s.shared ? {
            ...s.feedWindow, more: s.loadMoreFeed, restart: s.restartFeed, focus: s.focusFeed,
          } : undefined}
        />
      ) : <ShortsStudio s={s} />}
      {s.commentShort && s.config?.policy && (
      <ShortsComments
        key={s.commentShort.id}
        id={s.commentShort.id}
        creator={s.commentShort.creator}
        actor={s.actor}
        policy={s.config.policy}
        busy={s.busy}
        walletPending={s.walletPending}
        revision={s.commentRevision}
        publishedComment={s.publishedComment}
        onClose={() => s.setCommentShort(undefined)}
        onConnect={s.connectForComments}
        onAdd={s.addComment}
      />
      )}
      {s.claimReview && s.dashboard && s.config?.likeMode !== 'free' && (
        <ShortsDialog label="Review reward claim" busy={s.busy} suspended={s.walletPending} onClose={() => s.setClaimReview(false)}>
          <section className="sh-modal">
            <h2>Claim your rewards</h2>
            <p>
              {s.dashboard.account.available}
              {' '}
              {`${shortsUnit(s.paymentRelease?.network)} is currently available.`}
            </p>
            <p>Destination wallet</p>
            <code className="sh-address">{s.actor}</code>
            <p>The contract transfers your available balance when confirmed. Your wallet shows the additional network fee.</p>
            <button type="button" disabled={s.busy} onClick={() => s.setClaimReview(false)}>Cancel</button>
            <button type="button" className="primary" disabled={s.busy || Number(s.dashboard.account.available) <= 0} onClick={s.claim}>Confirm claim in wallet</button>
          </section>
        </ShortsDialog>
      )}
      {s.like && (
        <ShortsLikeDialog
          key={s.like.id}
          title={s.like.title}
          phase={s.likePhase}
          onClose={() => s.setLike(undefined)}
        />
      )}
      {walletRecovery.blocked && (
        <ShortsDialog label="Previous wallet request" busy={false} onClose={walletRecovery.dismissBlocked}>
          <section className="sh-modal">
            <h2>Previous wallet request</h2>
            <p>
              {unsent ? 'An earlier request is waiting for approval. You can finish it in the original tab or cancel it here.'
                : 'Your previous transaction is awaiting confirmation. Shorts will keep checking its status.'}
            </p>
            {unsent && <button type="button" onClick={walletRecovery.release}>Cancel unsent request</button>}
            {retryLike && <button type="button" onClick={walletRecovery.retrySponsorship}>Resend the signed Like</button>}
            <button type="button" onClick={walletRecovery.dismissBlocked}>Close</button>
          </section>
        </ShortsDialog>
      )}
    </div>
  );
};
