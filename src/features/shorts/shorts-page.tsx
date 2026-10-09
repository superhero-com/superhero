import { ShortsStudio } from './shorts-studio';
import { useShorts } from './use-shorts';
import { ShortsDialog } from './shorts-dialog';
import { ShortsLikeDialog } from './shorts-like-dialog';
import { ShortsViewer } from './shorts-viewer';
import './shorts.css';
import './shorts-viewer.css';

export const ShortsPage = () => {
  const s = useShorts();
  return (
    <div className={`shorts-app ${s.tab === 'feed' ? 'shorts-watching' : 'shorts-studio-page'}`}>
      {s.tab === 'feed' ? (
        <ShortsViewer
          feed={s.feed}
          topics={s.config?.topics || []}
          topic={s.topic}
          onTopic={s.setTopic}
          onLike={s.setLike}
          onReport={s.report}
          personal={s.personal}
          social={s.social}
          onConnect={s.connectWallet}
          onPlayback={s.playback}
          onStudio={() => s.setTab('studio')}
          onUpload={() => s.setTab('publish')}
          message={s.message}
          onDismissMessage={s.clearMessage}
          busy={s.busy}
          suspended={!!s.like || !!s.withdrawal || s.busy}
          ready={s.feedReady}
          shared={s.shared}
        />
      ) : <ShortsStudio s={s} />}
      {s.claimReview && s.dashboard && (
        <ShortsDialog label="Review reward claim" busy={s.busy} suspended={s.walletPending} onClose={() => s.setClaimReview(false)}>
          <section className="sh-modal">
            <h2>Claim your rewards</h2>
            <p>
              {s.dashboard.account.available}
              {' '}
              test AE is currently available.
            </p>
            <p>Destination wallet</p>
            <code className="sh-address">{s.actor}</code>
            <p>The contract transfers your available balance when confirmed. Your wallet shows the additional network fee.</p>
            {s.message && <p role="status">{s.message}</p>}
            <button type="button" disabled={s.busy} onClick={() => s.setClaimReview(false)}>Cancel</button>
            <button type="button" className="primary" disabled={s.busy || Number(s.dashboard.account.available) <= 0} onClick={s.claim}>Confirm claim in wallet</button>
          </section>
        </ShortsDialog>
      )}
      {s.withdrawal && (
        <ShortsDialog label="Withdraw Short" busy={s.busy} suspended={s.walletPending} onClose={() => s.setWithdrawal(undefined)}>
          <section className="sh-modal">
            <h2>Permanently withdraw this Short?</h2>
            <p>{s.withdrawal.title}</p>
            <p>Official playback stops and this video cannot be reactivated.</p>
            {s.message && <p role="status">{s.message}</p>}
            <button type="button" disabled={s.busy} onClick={() => s.setWithdrawal(undefined)}>Keep my Short</button>
            <button type="button" className="primary" disabled={s.busy} onClick={() => s.withdraw(s.withdrawal!.id)}>Confirm withdrawal in wallet</button>
          </section>
        </ShortsDialog>
      )}
      {s.like && (
        <ShortsLikeDialog
          key={s.like.id}
          title={s.like.title}
          connected={!!s.actor}
          busy={s.busy}
          walletPending={s.walletPending}
          error={s.messageTone === 'error' ? s.message : undefined}
          onClose={() => s.setLike(undefined)}
          onLike={s.confirmLike}
          onConnect={s.connectForLike}
        />
      )}
    </div>
  );
};
