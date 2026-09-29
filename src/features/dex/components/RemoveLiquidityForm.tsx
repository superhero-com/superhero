import {
  useEffect, useId, useRef, useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, ArrowRight, ChevronDown, Info, Layers, Settings2, ShieldCheck, X,
} from 'lucide-react';
import { CONFIG } from '../../../config';
import aeMark from '../../../svg/aeternity-mark.svg';
import Spinner from '../../../components/Spinner';
import { ConnectWalletButton } from '../../../components/ConnectWalletButton';
import SwapInlineSettings from '../../../components/dex/core/SwapInlineSettings';
import { useAccount, useDex } from '../../../hooks';
import { usePool } from '../context/PoolProvider';
import { useAddLiquidity } from '../hooks/useAddLiquidity';
import { useRemovalPreview } from '../hooks/useRemovalPreview';
import { removalAmount, removalEstimate } from '../utils/removalEstimate';
import { formatLiquidityValue } from '../utils/liquidityEstimate';
import type { LiquidityPosition } from '../types/pool';
import '../../../components/dex/core/SwapForm.css';
import './RemoveLiquidityForm.css';

const AssetBadge = ({ address, symbol }: { address: string; symbol: string }) => <span className={`swap-asset-badge${address === CONFIG.DEX_WAE ? ' is-ae' : ''}`} aria-hidden="true">{address === CONFIG.DEX_WAE ? <img src={aeMark} alt="" /> : symbol.slice(0, 1)}</span>;

const RemovalCard = ({ position, account }: { position: LiquidityPosition | null; account?: string }) => {
  const { t } = useTranslation('dex');
  const { clearSelection, onPositionUpdated } = usePool();
  const { slippagePct, deadlineMins } = useDex();
  const { executeRemoveLiquidity } = useAddLiquidity();
  const quote = useRemovalPreview(position, !!account);
  const [percentage, setPercentage] = useState(25);
  const [custom, setCustom] = useState('');
  const [mode, setMode] = useState<'percent' | 'lp'>('percent');
  const [review, setReview] = useState(false);
  const [details, setDetails] = useState(false);
  const [settings, setSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const submitting = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const settingsTrigger = useRef<HTMLButtonElement>(null);
  const settingsId = useId();
  const inputId = useId();
  const detailsId = useId();
  const amount = removalAmount(position?.balance || '', percentage, mode === 'lp' ? custom : undefined);
  const tokens = position ? [position.pair.token0, position.pair.token1] : [];
  const outputs = tokens.map((token) => ({ ...token, symbol: token.address === CONFIG.DEX_WAE ? 'AE' : token.symbol }));
  const estimate = position ? removalEstimate(amount.raw, quote.pool, [tokens[0].decimals, tokens[1].decimals], slippagePct) : null;
  const ready = !!account && amount.valid && quote.status === 'ready' && !!estimate && !loading;
  const closeSettings = () => { setSettings(false); settingsTrigger.current?.focus(); };
  const changeMode = (next: 'percent' | 'lp') => {
    if (next === mode) return;
    if (next === 'lp') setCustom(amount.amount || '');
    else setPercentage(amount.valid ? Math.min(100, Math.max(0, Number(amount.percentage))) : 25);
    setMode(next);
  };
  const handleRemove = async () => {
    if (!ready || !position || submitting.current) return;
    submitting.current = true;
    setSettings(false);
    setLoading(true);
    try {
      const hash = await executeRemoveLiquidity({
        tokenA: position.token0,
        tokenB: position.token1,
        tokenASymbol: outputs[0].symbol,
        tokenBSymbol: outputs[1].symbol,
        liquidity: amount.amount!,
        liquidityPct: amount.percentage,
        slippagePct,
        deadlineMins,
        isAePair: tokens.some((token) => token.address === CONFIG.DEX_WAE),
        isFullRemoval: amount.full,
        rawBalance: amount.full ? position.balance : undefined,
      });
      if (hash) {
        await onPositionUpdated();
        if (mounted.current) clearSelection();
      }
    } catch {
      // The shared transaction banner reports wallet and execution failures.
    } finally {
      submitting.current = false;
      if (mounted.current) setLoading(false);
    }
  };
  let action = t(review ? 'poolRemove.confirm' : 'poolRemove.review');
  if (loading) action = t('poolRemove.confirming');
  else if (quote.status === 'loading' || quote.status === 'idle') action = t('poolRemove.checking');
  else if (quote.status === 'error') action = t('poolRemove.unavailable');
  else if (!amount.valid) action = t('poolRemove.checkAmount');
  else if (!estimate) action = t('poolRemove.tooSmall');
  return (
    <section className="dex-swap pool-remove" aria-label={t('poolRemove.title')}>
      <header className="dex-swap__header">
        <div>
          <h2>{t(review ? 'poolRemove.reviewTitle' : 'poolRemove.title')}</h2>
          <p>{t(review ? 'poolRemove.reviewHint' : 'poolRemove.description')}</p>
        </div>
        <div className="remove-header-actions">
          <button ref={settingsTrigger} type="button" className="swap-settings-trigger" disabled={loading} aria-label={t('poolRemove.settings')} aria-expanded={settings} aria-controls={settingsId} onClick={() => setSettings(!settings)}><Settings2 aria-hidden="true" /></button>
          <button type="button" className="remove-close" disabled={loading} aria-label={t(review ? 'poolRemove.backAmount' : 'poolRemove.backAdd')} onClick={() => { if (review) setReview(false); else clearSelection(); }}>{review ? <ArrowLeft aria-hidden="true" /> : <X aria-hidden="true" />}</button>
        </div>
      </header>
      {settings && <SwapInlineSettings id={settingsId} title={t('poolRemove.settings')} hint={t('poolRemove.slippageHint')} onClose={closeSettings} />}
      {!position ? (
        <div className="remove-no-position">
          <Layers aria-hidden="true" />
          <h3>{t('poolRemove.choosePosition')}</h3>
          <p>{t('poolRemove.chooseHint')}</p>
          <button type="button" onClick={clearSelection}>{t('poolRemove.backAdd')}</button>
        </div>
      ) : (
        <>
          <div className="remove-pair">
            <div className="remove-pair-icons">{tokens.map((token) => <AssetBadge key={token.address} {...token} />)}</div>
            <div>
              <strong>
                <bdi>{tokens[0].symbol}</bdi>
                <span> / </span>
                <bdi>{tokens[1].symbol}</bdi>
              </strong>
              <p>{tokens.filter((token) => token.address !== CONFIG.DEX_WAE).map((token) => token.name).join(' · ')}</p>
            </div>
            <span className="remove-position-balance">
              {t('poolRemove.balance')}
              <bdi title={account ? amount.balance : undefined}>{account ? formatLiquidityValue(amount.balance, 8) : '—'}</bdi>
            </span>
          </div>
          {!review ? (
            <fieldset className="remove-amount" disabled={loading}>
              <div className="remove-amount-heading">
                <label htmlFor={inputId}>{t('poolRemove.amount')}</label>
                <div className="remove-mode" aria-label={t('poolRemove.amountMode')}>
                  <button type="button" aria-pressed={mode === 'percent'} onClick={() => changeMode('percent')}>%</button>
                  <button type="button" aria-pressed={mode === 'lp'} onClick={() => changeMode('lp')}>LP</button>
                </div>
              </div>
              <div className="remove-amount-value">
                {mode === 'percent' ? (
                  <>
                    <strong>{formatLiquidityValue(String(percentage), 4)}</strong>
                    <span>%</span>
                    <small>{t('poolRemove.ofPosition')}</small>
                  </>
                ) : (
                  <>
                    <input id={inputId} aria-label={t('poolRemove.lpRemove')} inputMode="decimal" autoComplete="off" value={custom} aria-invalid={amount.exceeds || undefined} onChange={(event) => { if (/^\d*(\.\d{0,18})?$/.test(event.target.value)) setCustom(event.target.value); }} />
                    <span>LP</span>
                    <button type="button" onClick={() => setCustom(amount.balance || '')}>{t('poolRemove.max')}</button>
                  </>
                )}
              </div>
              {mode === 'percent' ? (
                <>
                  <input id={inputId} type="range" aria-label={t('poolRemove.percentage')} min="0" max="100" step="0.1" value={percentage} onChange={(event) => setPercentage(Number(event.target.value))} style={{ background: `linear-gradient(to right,#7aa7ed ${percentage}%,var(--remove-line) ${percentage}%)` }} />
                  <div className="remove-presets">{[25, 50, 75, 100].map((value) => <button type="button" key={value} aria-pressed={percentage === value} onClick={() => setPercentage(value)}>{value === 100 ? t('poolRemove.max') : `${value}%`}</button>)}</div>
                </>
              ) : <p className="remove-lp-hint">{amount.valid ? t('poolRemove.percentPosition', { value: formatLiquidityValue(amount.percentage, 4) }) : t('poolRemove.amountHint')}</p>}
            </fieldset>
          ) : (
            <div className="remove-review-summary">
              <ShieldCheck aria-hidden="true" />
              <div>
                <strong>
                  <bdi title={amount.amount}>{formatLiquidityValue(amount.amount, 8)}</bdi>
                  {' '}
                  {t('positionsCard.lpTokens')}
                </strong>
                <span>{t('poolRemove.percentPosition', { value: formatLiquidityValue(amount.percentage, 4) })}</span>
              </div>
              <button type="button" disabled={loading} onClick={() => setReview(false)}>{t('poolRemove.edit')}</button>
            </div>
          )}
          {account && amount.exceeds && (
          <div className="swap-inline-state is-error" role="status">
            <Info aria-hidden="true" />
            <p>{t('poolRemove.exceeds')}</p>
          </div>
          )}
          <div className="remove-returns">
            <div className="remove-returns-heading">
              <span>{t('poolRemove.receive')}</span>
              <small>{t('poolRemove.estimated')}</small>
            </div>
            {quote.status === 'error' ? (
              <div className="remove-unavailable" role="status">
                <p>{t('poolRemove.estimateError')}</p>
                <button type="button" disabled={loading} onClick={() => { quote.refetch(); }}>{t('poolAdd.retry')}</button>
              </div>
            ) : outputs.map((token, index) => (
              <div className="remove-return" key={token.address}>
                <AssetBadge {...token} />
                <strong>{token.symbol}</strong>
                <bdi title={estimate?.[index].amount}>{account ? formatLiquidityValue(estimate?.[index].amount, 8) : '—'}</bdi>
              </div>
            ))}
            {(quote.status === 'loading' || tokens.some((token) => token.address === CONFIG.DEX_WAE)) && (
            <p className="remove-unwrapping">
              <Info aria-hidden="true" />
              {t(quote.status === 'loading' ? 'poolRemove.checking' : 'poolRemove.nativeHint')}
            </p>
            )}
          </div>
          <div className="remove-summary">
            <div>
              <span>{t('poolRemove.lpRemove')}</span>
              <bdi title={account ? amount.amount : undefined}>{account ? formatLiquidityValue(amount.amount, 8) : '—'}</bdi>
            </div>
            <div>
              <span>{t('poolRemove.remaining')}</span>
              <bdi title={account ? amount.remaining : undefined}>{account ? formatLiquidityValue(amount.remaining, 8) : '—'}</bdi>
            </div>
          </div>
          {account && amount.full && <p className="remove-full-note">{t('poolRemove.fullHint')}</p>}
          <div className="remove-details-row">
            <button type="button" aria-expanded={details} aria-controls={detailsId} onClick={() => setDetails(!details)}>
              {t('poolRemove.details')}
              <ChevronDown className={details ? 'rotated' : ''} aria-hidden="true" />
            </button>
            <button type="button" disabled={loading} onClick={() => setSettings(true)}>
              {t('poolRemove.slippage')}
              {' '}
              <b>
                {slippagePct}
                %
              </b>
              <Settings2 aria-hidden="true" />
            </button>
          </div>
          {details && (
          <dl className="remove-details" id={detailsId}>
            {outputs.map((token, index) => (
              <div key={token.address}>
                <dt>{t('poolRemove.minimum', { symbol: token.symbol })}</dt>
                <dd>
                  <bdi title={estimate?.[index].minimum}>{account ? formatLiquidityValue(estimate?.[index].minimum, 8) : '—'}</bdi>
                  {' '}
                  {token.symbol}
                </dd>
              </div>
            ))}
            <div>
              <dt>{t('settings.transactionDeadline')}</dt>
              <dd>
                {deadlineMins}
                {' '}
                {t('swapCard.minutes')}
              </dd>
            </div>
            <div className="remove-details-hint">{t('poolRemove.estimateHint')}</div>
          </dl>
          )}
          {account ? (
            <button type="button" className="swap-primary" disabled={!ready} onClick={() => { if (review) handleRemove(); else { setReview(true); setSettings(false); } }}>
              {loading && <span aria-hidden="true"><Spinner className="w-4 h-4" /></span>}
              {action}
              {ready && <ArrowRight aria-hidden="true" />}
            </button>
          ) : <ConnectWalletButton label={t('swapCard.connectWallet')} variant="swap" block />}
          <p className="swap-bottom-note">{t(review ? 'poolRemove.confirmHint' : 'poolRemove.reviewNote')}</p>
        </>
      )}
    </section>
  );
};

const RemoveLiquidityForm = () => {
  const { activeAccount } = useAccount();
  const { selectedPosition } = usePool();
  return <RemovalCard key={`${activeAccount || ''}:${selectedPosition?.pair.address || ''}:${selectedPosition?.balance || ''}`} account={activeAccount || undefined} position={selectedPosition} />;
};

export default RemoveLiquidityForm;
