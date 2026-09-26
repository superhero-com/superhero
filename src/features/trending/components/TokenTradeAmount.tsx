import {
  useEffect, useId, useRef, useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Hash } from 'lucide-react';
import aeMark from '@/svg/aeternity-mark.svg';
import { Decimal } from '@/libs/decimal';

interface TokenTradeAmountProps {
  value?: number;
  onChange: (value: number | undefined) => void;
  onFocus: () => void;
  symbol: string;
  ae: boolean;
  pay?: boolean;
  balance: string;
  connected: boolean;
  disabled: boolean;
  insufficient?: boolean;
  fiat?: string;
}

const TokenTradeAmount = ({
  value, onChange, onFocus, symbol, ae, pay = false, balance, connected, disabled,
  insufficient = false, fiat,
}: TokenTradeAmountProps) => {
  const { t } = useTranslation('trending');
  const id = useId();
  const focused = useRef(false);
  const [buffer, setBuffer] = useState(value == null ? '' : Decimal.from(value).toStringWithoutPrecision());
  useEffect(() => {
    setBuffer((current) => {
      // Keep intermediate decimals and trailing zeroes while the user edits this side.
      if (focused.current && current !== '' && Number(current) === value) return current;
      return value == null ? '' : Decimal.from(value).toStringWithoutPrecision();
    });
  }, [value]);
  const update = (raw: string) => {
    const next = raw.replace(/,/g, '.');
    if (!/^\d*(?:\.\d{0,21})?$/.test(next)) return;
    const parsed = next === '' || next === '.' ? undefined : Number(next);
    if (parsed !== undefined && !Number.isFinite(parsed)) return;
    setBuffer(next);
    onChange(parsed);
  };
  const asset = ae ? 'AE' : symbol;
  return (
    <div className={`trade-amount${insufficient ? ' has-error' : ''}`}>
      <label htmlFor={id}>
        {t(pay ? 'tradePanel.pay' : 'tradePanel.receive')}
        {!pay && (
        <span>
          {' '}
          {t('tradePanel.estimated')}
        </span>
        )}
      </label>
      <div className="trade-amount__main">
        <input
          id={id}
          aria-label={pay ? t('tradePanel.pay') : `${t('tradePanel.receive')} ${t('tradePanel.estimated')}`}
          type="text"
          inputMode="decimal"
          dir="ltr"
          placeholder="0.00"
          autoComplete="off"
          value={buffer}
          disabled={disabled}
          aria-invalid={insufficient || undefined}
          onChange={(event) => update(event.target.value)}
          onFocus={() => { focused.current = true; onFocus(); }}
          onBlur={() => { focused.current = false; }}
        />
        <span className={`trade-asset${ae ? ' is-ae' : ''}`}>
          <span className="trade-asset__icon" aria-hidden="true">
            {ae ? <img src={aeMark} alt="" /> : <Hash />}
          </span>
          <bdi>{asset}</bdi>
        </span>
      </div>
      <div className="trade-amount__meta">
        <span>
          {pay && connected && (
            <>
              {t('tradePanel.available')}
              {' '}
              <bdi>{`${Decimal.from(balance).prettify()} ${asset}`}</bdi>
            </>
          )}
          {pay && !connected && t('tradePanel.balance')}
          {!pay && <bdi>{fiat || '—'}</bdi>}
        </span>
        {pay && connected && (
          <button
            type="button"
            disabled={disabled || !Decimal.from(balance).gt(0)}
            onClick={() => {
              onFocus();
              update(balance);
            }}
          >
            {t('tradePanel.max')}
          </button>
        )}
      </div>
    </div>
  );
};
export default TokenTradeAmount;
