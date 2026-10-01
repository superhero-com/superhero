import { ShortsStudio } from './shorts-studio';
import { useShorts } from './use-shorts';
import { ShortsDialog } from './shorts-dialog';
import { ShortsLikeDialog } from './shorts-like-dialog';
import { ShortsViewer } from './shorts-viewer';
import './shorts.css';
import './shorts-viewer.css';

const date = (n: number) => (n
  ? new Date(n).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  : 'Not activated');
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
          onView={s.view}
          onReport={s.report}
          personal={s.personal}
          social={s.social}
          onConnect={s.connectWallet}
          onDeleteMeasurements={s.deleteMeasurements}
          onPlayback={s.playback}
          onStudio={() => s.setTab('studio')}
          onUpload={() => s.setTab('publish')}
          message={s.message}
          onDismissMessage={s.clearMessage}
          busy={s.busy}
          suspended={!!s.like || !!s.funding || !!s.withdrawal || s.busy}
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
            <p>Official playback stops. Purchased hosting is not refunded and this video cannot be reactivated.</p>
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
      {s.funding && (
        <ShortsDialog label="Hosting coverage" busy={s.busy} suspended={s.walletPending} onClose={s.closeFunding}>
          <section
            className="sh-modal"
          >
            <button
              type="button"
              className="sh-close"
              disabled={s.busy}
              onClick={s.closeFunding}
              aria-label="Close"
            >
              ×
            </button>
            <span className="sh-eyebrow">KEEP YOUR SHORT AVAILABLE</span>
            <h2>
              {s.quote ? 'Review hosting purchase' : 'Choose your coverage'}
            </h2>
            <p>{s.funding.title}</p>
            <p>Hosting keeps your video stored. Community-guidelines review decides feed visibility separately; payment does not guarantee inclusion in the feed.</p>
            {s.message && <p role="status">{s.message}</p>}
            {!s.quote ? (
              <>
                <label htmlFor="short-budget">
                  Budget in test AE
                  <input
                    id="short-budget"
                    aria-label="Hosting budget"
                    value={s.budget}
                    disabled={s.busy}
                    onChange={(e) => s.setBudget(e.target.value)}
                    inputMode="decimal"
                  />
                </label>
                <label htmlFor="short-source">
                  Fund from
                  <select
                    id="short-source"
                    aria-label="Funding source"
                    value={s.source}
                    disabled={s.busy}
                    onChange={(e) => s.setSource(e.target.value as 'wallet' | 'rewards')}
                  >
                    <option value="wallet">Testnet wallet</option>
                    <option value="rewards" disabled={Number(s.dashboard?.account.available || 0) <= 0}>
                      My available rewards (
                      {s.dashboard?.account.available || 0}
                      {' '}
                      AE)
                    </option>
                  </select>
                </label>
                <p>
                  Example tariff: 10 AE / 100 MB / 30 days. Final package size:
                  {(s.funding.bytes / 1e6).toFixed(2)}
                  {' '}
                  {`MB · ${s.config?.replicas || 2} local storage replicas.`}
                </p>
                <button
                  type="button"
                  className="primary"
                  disabled={s.busy}
                  onClick={s.createQuote}
                >
                  {s.busy ? 'Calculating coverage…' : 'Calculate coverage'}
                </button>
              </>
            ) : (
              <>
                <dl>
                  <dt>Exact debit</dt>
                  <dd>
                    {s.quote.charge}
                    {' '}
                    AE
                  </dd>
                  <dt>Funding source</dt>
                  <dd>{s.quote.source === 'wallet' ? 'Testnet wallet' : 'Available rewards'}</dd>
                  <dt>Coverage added</dt>
                  <dd>
                    {s.quote.days}
                    {' '}
                    days
                  </dd>
                  <dt>Estimated hosted until</dt>
                  <dd>{date(s.quote.estimatedUntil)}</dd>
                  <dt>Unused budget</dt>
                  <dd>
                    {s.quote.unused}
                    {' '}
                    AE
                  </dd>
                </dl>
                <small>
                  Purchased days are protected from price changes.
                  Initial/restored coverage starts after verified activation.
                  Gas is additional. Quote expires
                  {date(s.quote.expiresAt)}
                  .
                </small>
                <button type="button" disabled={s.busy} onClick={s.editQuote}>Change budget or source</button>
                <button
                  type="button"
                  className="primary"
                  disabled={s.busy || s.quote.expiresAt <= Date.now()}
                  onClick={s.confirmFunding}
                >
                  {s.busy ? 'Waiting for wallet & network…' : 'Confirm hosting purchase'}
                </button>
              </>
            )}
          </section>
        </ShortsDialog>
      )}
    </div>
  );
};
