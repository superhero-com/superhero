import {
  CalendarDays, CheckCircle2, ChevronDown, Clock3, Coins, Info, Pencil, ShieldCheck, Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { HostingPrices, Quote, Short } from './types';
import type { useShorts } from './use-shorts';
import { feedLabel, guidelinesStatus, hostingStatus } from './shorts-guidelines';

type State = ReturnType<typeof useShorts>;
const unit = 10n ** 18n;
const formatAe = (value: bigint) => `${value / unit}${value % unit ? `.${(value % unit).toString().padStart(18, '0').replace(/0+$/, '')}` : ''}`;
export const hostingPrice = (prices: HostingPrices, days: number) => {
  if (!Number.isInteger(days) || days < 1 || days > prices.maxDays) return undefined;
  const divisor = BigInt(prices.denominator);
  return formatAe((BigInt(prices.bytes) * BigInt(prices.numerator) * BigInt(days) + divisor - 1n) / divisor);
};
export const coverageDate = (timestamp: number) => new Date(timestamp).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
export type Coverage = { mode: 'days' | 'budget'; days: string; budget: string };
export const validCoverage = (selection: Coverage) => (selection.mode === 'days'
  ? /^\d+$/.test(selection.days) && Number(selection.days) >= 1 && Number(selection.days) <= 3650
  : /^\d{1,6}(\.\d{1,18})?$/.test(selection.budget) && Number(selection.budget) > 0);

export const UploadFeedStatus = ({ video }: { video: Short }) => (guidelinesStatus(video) === 'unavailable' ? null : (
  <div className="su-feed-status">
    <ShieldCheck size={19} aria-hidden="true" />
    <div>
      <strong>{feedLabel(video)}</strong>
      <p>{guidelinesStatus(video) === 'eligible' ? 'Your Short can appear in the feed once hosting is active.' : 'Hosting lets you share your Short by link. Feed inclusion requires a separate review.'}</p>
      {guidelinesStatus(video) === 'ineligible' && video.guidelines?.reason && <p>{video.guidelines.reason}</p>}
    </div>
  </div>
));

export const UploadCoverage = ({
  s, video, selection, onChange,
}: {
  s: State; video: Short; selection: Coverage; onChange: (value: Coverage) => void;
}) => {
  const prices = s.uploadPrices?.shortId === video.id ? s.uploadPrices : undefined;
  const estimated = prices && selection.mode === 'days' ? hostingPrice(prices, Number(selection.days)) : undefined;
  const custom = selection.mode === 'budget' || ![7, 30, 90].includes(Number(selection.days));
  const estimateLabel = (value: string) => Number(value).toLocaleString(undefined, { maximumSignificantDigits: 6 });
  const total = selection.mode === 'budget' ? selection.budget : '—';
  return (
    <div className="su-coverage">
      <fieldset className="su-plans" disabled={s.busy || !prices}>
        <legend>Choose a duration</legend>
        {[7, 30, 90].map((days) => (
          <label key={days} className={selection.mode === 'days' && Number(selection.days) === days ? 'selected' : ''}>
            <input type="radio" aria-label={`${days} days`} name="short-hosting-plan" value={days} checked={selection.mode === 'days' && Number(selection.days) === days} onChange={() => onChange({ ...selection, mode: 'days', days: String(days) })} />
            <strong>
              {days}
              <small>days</small>
            </strong>
            <span>{prices ? `≈ ${estimateLabel(hostingPrice(prices, days)!)} AE` : 'Loading…'}</span>
          </label>
        ))}
      </fieldset>
      {!prices && (
      <p role="status">
        Prices aren’t available yet.
        <button type="button" disabled={s.busy} onClick={() => s.loadUploadPrices(video.id)}>Retry prices</button>
      </p>
      )}
      <details className="su-custom-coverage">
        <summary>
          Custom duration or budget
          {' '}
          {custom && <span>{selection.mode === 'days' ? `${selection.days || '—'} days` : `${selection.budget || '—'} AE`}</span>}
        </summary>
        <div className="su-field-pair">
          <label htmlFor="su-coverage-mode">
            Choose by
            <select id="su-coverage-mode" disabled={s.busy} value={selection.mode} onChange={(e) => onChange({ ...selection, mode: e.target.value as Coverage['mode'] })}>
              <option value="days">Number of days</option>
              <option value="budget">My budget</option>
            </select>
          </label>
          {selection.mode === 'days' ? (
            <label htmlFor="su-days">
              Number of days
              <input id="su-days" disabled={s.busy} type="number" min="1" max="3650" step="1" value={selection.days} onChange={(e) => onChange({ ...selection, days: e.target.value })} />
            </label>
          ) : (
            <label htmlFor="su-budget">
              Budget in test AE
              <input id="su-budget" disabled={s.busy} inputMode="decimal" value={selection.budget} onChange={(e) => onChange({ ...selection, budget: e.target.value })} />
            </label>
          )}
        </div>
      </details>
      {!validCoverage(selection) && <p className="su-error" role="alert">{selection.mode === 'days' ? 'Choose 1–3650 whole days.' : 'Enter a valid AE amount greater than 0.'}</p>}
      <div className="su-price-summary">
        <div className="su-payment-row">
          <div className="su-estimate" aria-live="polite">
            <span>{selection.mode === 'days' ? 'Estimated total' : 'Your budget'}</span>
            <strong>
              {estimated ? `≈ ${estimateLabel(estimated)}` : total}
              {' '}
              <small>test AE</small>
            </strong>
          </div>
          <fieldset className="su-plans su-payment-options" disabled={s.busy}>
            <legend>Pay with</legend>
            <label htmlFor="su-source-wallet" className={s.source === 'wallet' ? 'selected' : ''}>
              <input id="su-source-wallet" type="radio" name="short-payment-source" value="wallet" aria-label="My wallet" checked={s.source === 'wallet'} onChange={() => { s.editQuote(); s.setSource('wallet'); }} />
              <Wallet size={18} aria-hidden="true" />
              <b>My wallet</b>
            </label>
            <label htmlFor="su-source-rewards" className={s.source === 'rewards' ? 'selected' : ''}>
              <input id="su-source-rewards" type="radio" name="short-payment-source" value="rewards" aria-label="My rewards" aria-describedby="su-rewards-available" disabled={!Number(s.dashboard?.account.available)} checked={s.source === 'rewards'} onChange={() => { s.editQuote(); s.setSource('rewards'); }} />
              <Coins size={18} aria-hidden="true" />
              <b>My rewards</b>
              <small id="su-rewards-available">
                {Number(s.dashboard?.account.available) ? `${s.dashboard!.account.available} AE available` : 'No rewards yet'}
              </small>
            </label>
          </fieldset>
        </div>
        <p>{selection.mode === 'days' ? 'One-time payment. No auto-renewal.' : 'Review how many days your budget covers next.'}</p>
      </div>
      <details className="su-price-info">
        <summary>
          <Info size={15} aria-hidden="true" />
          {' '}
          About this cost
        </summary>
        <p>Pricing depends on video size and the number of days you choose. Review the exact total next. A network fee applies, even when using rewards. Paid days won’t change if prices go up.</p>
      </details>
    </div>
  );
};

export const UploadReview = ({
  video, quote, expired, languageLabel, busy, onEdit,
}: {
  video: Short; quote?: Quote; expired: boolean; languageLabel: string;
  busy: boolean; onEdit: (step: 1 | 2) => void;
}) => (
  <div className="su-review">
    <section className="su-review-short" aria-label="Your Short">
      <div className="su-review-heading">
        <h3>{video.title}</h3>
        <button type="button" disabled={busy} onClick={() => onEdit(1)}>
          <Pencil size={14} aria-hidden="true" />
          Edit details
        </button>
      </div>
      <div className="su-tags">
        <span>{video.topic}</span>
        <span>{languageLabel}</span>
        {video.synthetic && <span>AI-altered</span>}
        {video.sponsored && <span>Sponsored</span>}
      </div>
      {video.description && (
        <details className="su-review-description">
          <summary>Description</summary>
          <p className="su-description">{video.description}</p>
        </details>
      )}
    </section>
    {quote && (
      <section className="su-review-summary" aria-label="Hosting and payment">
        <div className="su-review-heading">
          <div className="su-review-duration">
            <CalendarDays size={19} aria-hidden="true" />
            <div>
              <strong>
                {quote.days}
                {' '}
                days available
              </strong>
              <small>{`Until about ${coverageDate(quote.estimatedUntil)}`}</small>
            </div>
          </div>
          <button type="button" disabled={busy} onClick={() => onEdit(2)}>
            <Pencil size={14} aria-hidden="true" />
            Edit hosting
          </button>
        </div>
        <div className="su-review-charge">
          <div>
            <span>One-time payment</span>
            <small>{quote.source === 'wallet' ? 'From your wallet' : 'From your rewards'}</small>
          </div>
          <strong>
            {quote.charge}
            {' '}
            <small>test AE</small>
          </strong>
        </div>
        <p id="su-payment-context">You’ll confirm in your wallet. Network fee is additional.</p>
      </section>
    )}
    {expired && <p className="su-error" role="alert">This price has expired. Update it before continuing. You haven’t been charged.</p>}
    {guidelinesStatus(video) === 'ineligible' && <UploadFeedStatus video={video} />}
    <div className="su-review-help">
      <details>
        <summary>
          <Info size={15} aria-hidden="true" />
          Payment &amp; duration
          <ChevronDown size={15} className="su-info-chevron" aria-hidden="true" />
        </summary>
        <div>
          <p>Your paid days start when hosting is active. There’s no auto-renewal; extend anytime in Studio.</p>
          <p>Your wallet shows the network fee before you confirm. This fee comes from your wallet even when hosting is paid with rewards.</p>
          {quote && quote.unused !== '0' && <p>{`${quote.unused} AE of your budget will stay unspent.`}</p>}
        </div>
      </details>
      <details>
        <summary>
          <Info size={15} aria-hidden="true" />
          Sharing &amp; feed
          <ChevronDown size={15} className="su-info-chevron" aria-hidden="true" />
        </summary>
        <div>
          <p>Hosting keeps your Short available to watch and share by link. It doesn’t guarantee a place in the feed.</p>
          {guidelinesStatus(video) !== 'ineligible' && <UploadFeedStatus video={video} />}
        </div>
      </details>
    </div>
  </div>
);

export const UploadOutcome = ({ s }: { s: State }) => {
  const payment = s.uploadPayment!;
  const video = s.dashboard?.shorts.find((v) => v.id === payment.shortId) || s.preparedUpload!.video;
  const active = payment.status === 'active' || hostingStatus(video) === 'active';
  const eligible = guidelinesStatus(video) === 'eligible';
  const pending = s.dashboard?.pending.find((item) => item.id === payment.quoteId);
  let title = 'Confirm hosting in your wallet';
  let copy = 'Review the amount and network fee. You can cancel and return to your Short.';
  if (payment.status === 'activating') { title = 'Making your Short available'; copy = 'Payment received. We’re verifying your video’s hosting. You won’t need to pay again.'; }
  if (payment.status === 'pending') { title = 'Payment received. Finishing setup.'; copy = 'Activation is taking longer than expected. We’ll keep trying while the local service is running. Track this purchase in Studio.'; }
  if (payment.status === 'uncertain') { title = 'Let’s check your payment'; copy = 'The wallet response was interrupted. Check this purchase in Studio and your wallet before making another payment.'; }
  if (active) { title = eligible ? 'Your Short is live.' : 'Your Short is ready to share.'; copy = eligible ? 'Your hosting is active and your Short is eligible for the feed.' : 'Hosting is active. Share your Short using its link.'; }
  return (
    <section className={`su-outcome ${active ? 'is-live' : ''}`} aria-live="polite">
      <div className="su-outcome-art">{active ? <CheckCircle2 size={48} aria-hidden="true" /> : <Clock3 size={42} aria-hidden="true" />}</div>
      <span className="su-kicker">{active ? 'YOUR MOMENT IS OUT THERE' : 'YOUR HOSTING PURCHASE'}</span>
      <h2>{title}</h2>
      <p>{copy}</p>
      {active && video.until > Date.now() && (
      <p>
        Available until
        <strong>{coverageDate(video.until)}</strong>
        . Extend anytime from Studio.
      </p>
      )}
      {active && <UploadFeedStatus video={video} />}
      <div className="su-outcome-actions">
        {active && <Link className="ss-button primary" to={`/shorts?short=${video.id}`}>Watch & share</Link>}
        <Link className="ss-button" to={`/shorts/studio/video/${video.id}`}>View in Studio</Link>
        {pending && <button type="button" disabled={s.busy || !s.authenticated} onClick={() => s.recover(pending.id, false)}>Retry activation</button>}
        {pending?.refundable && <button type="button" disabled={s.busy || !s.authenticated} onClick={() => s.recover(pending.id, true)}>Restore funding</button>}
        {active && <button type="button" disabled={s.busy} onClick={s.resetUpload}>Create another Short</button>}
      </div>
    </section>
  );
};
