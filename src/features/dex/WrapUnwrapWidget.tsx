import {
  useCallback, useEffect, useId, useRef, useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowDownUp, ArrowRight, ChevronDown, Info, Package, PackageOpen, ShieldCheck, ArrowLeft,
} from 'lucide-react';
import { ConnectWalletButton } from '../../components/ConnectWalletButton';
import { useSwapExecution } from '../../components/dex/hooks/useSwapExecution';
import { useTokenBalances } from '../../components/dex/hooks/useTokenBalances';
import { useAccount, useAeSdk } from '../../hooks';
import { CONFIG } from '../../config';
import Spinner from '../../components/Spinner';
import aeMark from '../../svg/aeternity-mark.svg';
import { wrapAmounts, WRAP_MAX_FEE_RESERVE_AE } from './utils/wrapAmounts';
import '../../components/dex/core/SwapForm.css';
import './WrapUnwrapWidget.css';

interface WrapUnwrapWidgetProps { className?: string }
type Mode = 'wrap' | 'unwrap';
const aeToken = {
  address: 'AE', name: 'Aeternity', symbol: 'AE', decimals: 18, is_ae: true,
};
const waeToken = {
  address: CONFIG.DEX_WAE, name: 'Wrapped AE', symbol: 'WAE', decimals: 18, is_ae: false,
};

const Asset = ({ wrapped }: { wrapped: boolean }) => {
  const { t } = useTranslation('dex');
  return (
    <span className="wrap-asset">
      <span className={`wrap-badge ${wrapped ? 'is-wrapped' : ''}`} aria-hidden="true">
        <img src={aeMark} alt="" />
        {wrapped && <span>W</span>}
      </span>
      <span>
        <strong>{wrapped ? 'WAE' : 'AE'}</strong>
        <small>{t(wrapped ? 'wrapCard.wrapped' : 'wrapCard.native')}</small>
      </span>
    </span>
  );
};

const WrapCard = ({ className, account }: WrapUnwrapWidgetProps & { account?: string }) => {
  const { t } = useTranslation('dex');
  const { loadAccountData } = useAccount();
  const { wrapBalances } = useTokenBalances(null, null);
  const { executeSwap, loading } = useSwapExecution();
  const [mode, setMode] = useState<Mode>('wrap');
  const [input, setInput] = useState('');
  const [details, setDetails] = useState(false);
  const [review, setReview] = useState(false);
  const [maxUsed, setMaxUsed] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [balanceStatus, setBalanceStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const pending = useRef(false);
  const mounted = useRef(true);
  const inputId = useId();
  const detailsId = useId();
  const wrap = mode === 'wrap';
  const from = wrap ? 'AE' : 'WAE';
  const to = wrap ? 'WAE' : 'AE';
  const amounts = wrapAmounts(
    input,
    wrap ? wrapBalances.ae : wrapBalances.wae,
    wrapBalances.ae,
    wrap,
  );
  const busy = submitting || loading;
  const balancesReady = balanceStatus === 'ready' && amounts.known;
  const ready = !!account && balancesReady && amounts.ready && !busy;

  const refreshBalances = useCallback(async (force = false) => {
    if (!account) return;
    setBalanceStatus('loading');
    try {
      await loadAccountData({ force });
      if (mounted.current) setBalanceStatus('ready');
    } catch {
      if (mounted.current) setBalanceStatus('error');
    }
  }, [account, loadAccountData]);

  useEffect(() => {
    mounted.current = true;
    refreshBalances();
    return () => { mounted.current = false; };
  }, [refreshBalances]);

  const changeMode = (next: Mode) => {
    setMode(next);
    setReview(false);
    setError('');
    setMaxUsed(false);
  };
  const updateAmount = (raw: string) => {
    const value = raw.replace(/,/g, '.');
    if (!/^\d*(?:\.\d{0,18})?$/.test(value)) return;
    setInput(value.startsWith('.') ? `0${value}` : value);
    setMaxUsed(false);
    setError('');
  };
  const confirm = async () => {
    if (!review || !ready || pending.current) return;
    pending.current = true;
    setSubmitting(true);
    setError('');
    try {
      const hash = await executeSwap({
        tokenIn: wrap ? aeToken : waeToken,
        tokenOut: wrap ? waeToken : aeToken,
        amountIn: amounts.amount!,
        amountOut: amounts.amount!,
        path: [],
        // Direct WAE deposit/withdraw ignores router slippage and deadline.
        slippagePct: 0,
        deadlineMins: 20,
        isExactIn: true,
      });
      if (hash && mounted.current) {
        setInput('');
        setReview(false);
        setMaxUsed(false);
        await refreshBalances(true);
      }
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : t('wrapCard.failed'));
    } finally {
      pending.current = false;
      if (mounted.current) setSubmitting(false);
    }
  };
  let action = t(review ? 'wrapCard.confirm' : `wrapCard.review.${mode}`);
  if (busy) action = t('wrapCard.confirming');
  else if (balanceStatus === 'error') action = t('wrapCard.balanceUnavailable');
  else if (!balancesReady) action = t('wrapCard.loading');
  else if (amounts.exceeds) action = t('wrapCard.insufficientAction', { symbol: from });
  else if (!amounts.hasFeeFunds) action = t('wrapCard.feeAction');
  else if (!amounts.valid) action = t('wrapCard.enterAmount');

  return (
    <section className={`dex-swap wrap-card ${className || ''}`} aria-label={t('wrapCard.title')}>
      <header className="wrap-heading">
        <div>
          <h2>{t(review ? `wrapCard.review.${mode}` : 'wrapCard.title')}</h2>
          <p>{t(review ? 'wrapCard.reviewHint' : 'wrapCard.description')}</p>
        </div>
        {review ? <button type="button" disabled={busy} aria-label={t('wrapCard.back')} onClick={() => setReview(false)}><ArrowLeft aria-hidden="true" /></button> : <span className="wrap-heading-icon"><Package aria-hidden="true" /></span>}
      </header>
      {!review ? (
        <div className="wrap-mode" aria-label={t('wrapCard.direction')}>
          <button type="button" disabled={busy} aria-pressed={wrap} onClick={() => changeMode('wrap')}>
            <Package aria-hidden="true" />
            {t('wrapCard.wrap')}
          </button>
          <button type="button" disabled={busy} aria-pressed={!wrap} onClick={() => changeMode('unwrap')}>
            <PackageOpen aria-hidden="true" />
            {t('wrapCard.unwrap')}
          </button>
        </div>
      ) : (
        <div className="wrap-review-label">
          <ShieldCheck aria-hidden="true" />
          <span>
            {t('wrapCard.convert', { amount: amounts.output, from, to })}
            <small>{t('wrapCard.exactConversion')}</small>
          </span>
          <button type="button" disabled={busy} onClick={() => setReview(false)}>{t('wrapCard.edit')}</button>
        </div>
      )}
      <div className={`wrap-input ${account && balancesReady && amounts.exceeds ? 'has-error' : ''}`}>
        <label htmlFor={inputId}>{t(review ? 'wrapCard.send' : `wrapCard.amount.${mode}`)}</label>
        <div className="wrap-value">
          <input id={inputId} type="text" inputMode="decimal" autoComplete="off" dir="ltr" placeholder="0.00" value={input} onChange={(event) => updateAmount(event.target.value)} disabled={busy} readOnly={review} aria-invalid={(!!account && balancesReady && amounts.exceeds) || undefined} />
          <Asset wrapped={!wrap} />
        </div>
        <div className="wrap-balance">
          <span>
            {!account && t('swapCard.connectBalance')}
            {account && !balancesReady && t(balanceStatus === 'error' ? 'wrapCard.balanceUnavailable' : 'wrapCard.loading')}
            {account && balancesReady && (
            <>
              {t('swapCard.available')}
              {' '}
              <bdi>
                {amounts.balance}
                {' '}
                {from}
              </bdi>
            </>
            )}
          </span>
          {account && balancesReady && !review && (
            <span className="wrap-quick">
              <button type="button" disabled={busy || amounts.half === '0'} onClick={() => updateAmount(amounts.half)}>50%</button>
              <button type="button" disabled={busy || amounts.max === '0'} onClick={() => { updateAmount(amounts.max); setMaxUsed(wrap); }}>{t('swapCard.max')}</button>
            </span>
          )}
        </div>
      </div>
      <div className="wrap-connector"><button type="button" disabled={review || busy} aria-label={t('wrapCard.reverse')} onClick={() => changeMode(wrap ? 'unwrap' : 'wrap')}><ArrowDownUp aria-hidden="true" /></button></div>
      <div className="wrap-output">
        <div className="wrap-output-copy">
          <span>
            {t('wrapCard.receive')}
            {' '}
            <small>1:1</small>
          </span>
          <strong><bdi>{amounts.output}</bdi></strong>
        </div>
        <Asset wrapped={wrap} />
      </div>
      {account && balanceStatus === 'error' && (
      <div className="swap-inline-state" role="status">
        <Info aria-hidden="true" />
        <div>
          <p>{t('wrapCard.balanceError')}</p>
          <button className="wrap-retry" type="button" disabled={busy} onClick={() => refreshBalances(true)}>{t('poolAdd.retry')}</button>
        </div>
      </div>
      )}
      {account && balancesReady && amounts.exceeds && (
      <div className="swap-inline-state is-error" role="status">
        <Info aria-hidden="true" />
        <p>
          {t('wrapCard.insufficient', { balance: amounts.balance, symbol: from })}
          <span>{t('wrapCard.smallerAmount')}</span>
        </p>
      </div>
      )}
      {account && balancesReady && !amounts.exceeds && !amounts.hasFeeFunds && (
      <div className="swap-inline-state is-error" role="status">
        <Info aria-hidden="true" />
        <p>
          {t('wrapCard.feeNeeded')}
          <span>{t('wrapCard.feeHint')}</span>
        </p>
      </div>
      )}
      {error && (
      <div className="swap-inline-state is-error" role="status">
        <Info aria-hidden="true" />
        <p>{error}</p>
      </div>
      )}
      <div className="wrap-rate">
        <span>
          <span className="wrap-rate-dot" />
          <bdi>1 AE = 1 WAE</bdi>
        </span>
        <button type="button" aria-expanded={details} aria-controls={detailsId} onClick={() => setDetails(!details)}>
          {t('wrapCard.details')}
          <ChevronDown aria-hidden="true" className={details ? 'rotated' : ''} />
        </button>
      </div>
      {details && (
        <div id={detailsId} className="wrap-details">
          <dl>
            <div>
              <dt>{t('wrapCard.conversion')}</dt>
              <dd>{t('wrapCard.exact')}</dd>
            </div>
            <div>
              <dt>{t('wrapCard.fee')}</dt>
              <dd>{t('wrapCard.walletFee')}</dd>
            </div>
            {account && balancesReady && amounts.remaining !== undefined && (
            <div>
              <dt>{t('wrapCard.remaining', { symbol: from })}</dt>
              <dd>
                <bdi>
                  {amounts.remaining}
                  {' '}
                  {from}
                </bdi>
              </dd>
            </div>
            )}
          </dl>
          <p>{t(wrap ? 'wrapCard.wrapHelp' : 'wrapCard.unwrapHelp')}</p>
        </div>
      )}
      <div className="wrap-fee-note">
        <Info aria-hidden="true" />
        <span>{maxUsed ? t('wrapCard.maxReserve', { amount: WRAP_MAX_FEE_RESERVE_AE }) : t('wrapCard.separateFee')}</span>
      </div>
      {account ? (
        <button type="button" className="swap-primary" disabled={!ready} onClick={() => { if (review) confirm(); else setReview(true); }}>
          {busy && <span aria-hidden="true"><Spinner className="w-4 h-4" /></span>}
          {action}
          {ready && <ArrowRight aria-hidden="true" />}
        </button>
      ) : <ConnectWalletButton label={t('swapCard.connectWallet')} variant="swap" block />}
      <p className="swap-bottom-note">{t(review ? 'wrapCard.confirmHint' : 'wrapCard.reviewNote')}</p>
    </section>
  );
};

export const WrapUnwrapWidget = (props: WrapUnwrapWidgetProps) => {
  const { activeAccount } = useAeSdk();
  return <WrapCard key={activeAccount || 'disconnected'} account={activeAccount || undefined} {...props} />;
};
