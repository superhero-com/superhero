import { useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowUpRight, Check, ChevronDown, Settings2, Wallet,
} from 'lucide-react';
import type { TokenDto } from '@/api/generated/models/TokenDto';
import Spinner from '@/components/Spinner';
import { formatFractionalPrice } from '@/utils/common';
import FractionFormatter from '@/features/shared/components/FractionFormatter';
import type { useTokenTrade } from '../hooks/useTokenTrade';
import TradeTokenInput from './TradeTokenInput';
import './TokenTradePanel.css';

interface TokenTradePanelProps {
  token: TokenDto;
  trade: ReturnType<typeof useTokenTrade>;
  connected: boolean;
  connecting?: boolean;
  onConnect: () => void;
  onClose?: () => void;
}

const TokenTradePanel = ({
  token, trade, connected, connecting = false, onConnect, onClose,
}: TokenTradePanelProps) => {
  const { t, i18n } = useTranslation('trending');
  const [settings, setSettings] = useState(false);
  const [details, setDetails] = useState(false);
  const [draft, setDraft] = useState('');
  const settingsId = useId();
  const slippageId = useId();
  const detailsId = useId();
  const settingsButton = useRef<HTMLButtonElement>(null);
  const {
    tokenA, tokenB, isBuying, isAllowSelling, loadingTransaction, errorMessage,
    isInsufficientBalance, averageTokenPrice, priceImpactDiff, protocolTokenReward,
    userBalance, spendableAeBalance, estimatedNextTokenPriceImpactDifferenceFormattedPercentage,
    slippage, switchTradeView, setTokenAmount, setSlippage, placeTokenTradeOrder,
  } = trade;
  const symbol = token.symbol || token.name;
  const hasAmount = Number.isFinite(tokenA) && tokenA > 0 && Number.isFinite(tokenB) && tokenB > 0;
  const parsedSlippage = Number(draft);
  const validDraft = /^\d*(?:\.\d*)?$/.test(draft) && draft !== '' && draft !== '.'
    && Number.isFinite(parsedSlippage) && parsedSlippage >= 0 && parsedSlippage <= 50;
  const closeSettings = () => { setSettings(false); settingsButton.current?.focus(); };
  let action = t(isBuying ? 'tradePanel.buyToken' : 'tradePanel.sellToken', { symbol });
  if (!hasAmount) action = t('tradePanel.enter');
  if (isInsufficientBalance) action = t('tradePanel.insufficient');
  if (!connected) action = t(connecting ? 'tradePanel.connecting' : 'tradePanel.connect');
  if (loadingTransaction) action = t('tradePanel.confirm');
  const disabled = connecting || loadingTransaction
    || (connected && (isInsufficientBalance || !hasAmount));
  return (
    <div className="token-trade" dir={i18n.dir()}>
      <section className="trade-card" aria-label={t('tradePanel.title', { symbol })}>
        <header className="trade-heading">
          <h2>{t('tradePanel.title', { symbol })}</h2>
          <p>{t('tradePanel.subtitle')}</p>
        </header>
        <div className="trade-modes" role="group" aria-label={t('tradePanel.direction')}>
          <button type="button" aria-pressed={isBuying} disabled={loadingTransaction} onClick={() => switchTradeView(true)}>{t('tradePanel.buy')}</button>
          <button type="button" aria-pressed={!isBuying} disabled={loadingTransaction} onClick={() => switchTradeView(false)}>{t('tradePanel.sell')}</button>
        </div>
        {errorMessage && <p className="trade-error" role="alert">{errorMessage}</p>}
        <TradeTokenInput
          token={token}
          tokenA={tokenA}
          tokenB={tokenB}
          isBuying={isBuying}
          userBalance={userBalance || '0'}
          spendableAeBalance={spendableAeBalance}
          onTokenAChange={(value) => setTokenAmount(value, true)}
          onTokenBChange={(value) => setTokenAmount(value, false)}
          onTokenAFocus={() => setTokenAmount(tokenA, true)}
          onTokenBFocus={() => setTokenAmount(tokenB, false)}
          onToggleTradeView={() => switchTradeView(!isBuying)}
          isInsufficientBalance={isInsufficientBalance}
          connected={connected}
          readonly={loadingTransaction}
        />
        {connected && isInsufficientBalance && <p className="trade-error" role="status">{t('tradePanel.insufficient')}</p>}
        <div className="trade-summary">
          <div>
            <span>{t('tradePanel.average')}</span>
            <bdi>
              {hasAmount && !averageTokenPrice.isZero && !averageTokenPrice.infinite ? (
                <>
                  <FractionFormatter fractionalPrice={formatFractionalPrice(averageTokenPrice)} />
                  {' '}
                  AE
                </>
              ) : '—'}
            </bdi>
          </div>
          <div>
            <span>{t('tradePanel.slippage')}</span>
            <button
              type="button"
              ref={settingsButton}
              disabled={loadingTransaction}
              aria-label={`${t('tradePanel.settings')} · ${slippage}%`}
              aria-expanded={settings}
              aria-controls={settingsId}
              onClick={() => { setDraft(String(slippage)); setSettings(!settings); }}
            >
              <bdi>{`${slippage}%`}</bdi>
              <Settings2 aria-hidden="true" />
            </button>
          </div>
        </div>
        {settings && (
          <section className="trade-settings" id={settingsId} aria-label={t('tradePanel.settings')}>
            <h3>{t('tradePanel.settings')}</h3>
            <p>{t('tradePanel.settingCopy')}</p>
            <div className="trade-presets">
              {[1, 3, 5].map((value) => (
                <button type="button" key={value} disabled={loadingTransaction} aria-pressed={draft === String(value)} onClick={() => setDraft(String(value))}>{`${value}%`}</button>
              ))}
              <label htmlFor={slippageId}>
                <span>{t('tradePanel.custom')}</span>
                <input
                  id={slippageId}
                  aria-label={t('tradePanel.custom')}
                  inputMode="decimal"
                  value={draft}
                  disabled={loadingTransaction}
                  aria-invalid={!validDraft}
                  onChange={(event) => setDraft(event.target.value.replace(/,/g, '.'))}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') closeSettings();
                    if (event.key === 'Enter' && validDraft && !loadingTransaction) {
                      setSlippage(parsedSlippage); closeSettings();
                    }
                  }}
                />
                <span>%</span>
              </label>
            </div>
            {!validDraft && <p role="status">{t('tradePanel.invalid')}</p>}
            <div className="trade-settings__actions">
              <button type="button" onClick={closeSettings}>{t('tradePanel.cancel')}</button>
              <button type="button" disabled={!validDraft || loadingTransaction} onClick={() => { setSlippage(parsedSlippage); closeSettings(); }}>
                <Check aria-hidden="true" />
                {t('tradePanel.save')}
              </button>
            </div>
          </section>
        )}
        <button type="button" className="trade-details-toggle" aria-expanded={details} aria-controls={detailsId} onClick={() => setDetails(!details)}>
          {t('tradePanel.details')}
          <ChevronDown aria-hidden="true" />
        </button>
        {details && (
          <dl id={detailsId} className="trade-details">
            <div>
              <dt>{t('tradePanel.impact')}</dt>
              <dd dir="ltr">
                {hasAmount ? (
                  <>
                    {!priceImpactDiff.isZero && (isBuying ? '+' : '−')}
                    <FractionFormatter fractionalPrice={formatFractionalPrice(priceImpactDiff)} />
                    {' '}
                    AE
                    <span>{` (${estimatedNextTokenPriceImpactDifferenceFormattedPercentage}%)`}</span>
                  </>
                ) : '—'}
              </dd>
            </div>
            {isBuying && (
            <div>
              <dt>{t('tradePanel.reward')}</dt>
              <dd>{hasAmount ? `≈ ${protocolTokenReward}` : '—'}</dd>
            </div>
            )}
          </dl>
        )}
        <button
          type="button"
          className="trade-submit"
          disabled={disabled}
          onClick={() => { if (connected) placeTokenTradeOrder(token); else onConnect(); }}
        >
          {(loadingTransaction || connecting) && <Spinner className="w-4 h-4" />}
          {!loadingTransaction && !connecting && !connected && <Wallet aria-hidden="true" />}
          <span>{action}</span>
          {loadingTransaction && !isBuying && <bdi>{isAllowSelling ? '1/2' : '2/2'}</bdi>}
          {connected && !disabled && <ArrowUpRight aria-hidden="true" />}
        </button>
        <p className="trade-note">{t('tradePanel.note')}</p>
        {onClose && <button type="button" className="trade-cancel" onClick={onClose}>{t('tradePanel.cancel')}</button>}
      </section>
    </div>
  );
};
export default TokenTradePanel;
