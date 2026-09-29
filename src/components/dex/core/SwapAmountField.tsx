import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { DexTokenDto } from '../../../api/generated';
import { Decimal } from '../../../libs/decimal';
import { fromAettos, toAettos } from '../../../libs/dex';
import TokenSelector from './TokenSelector';

interface Props {
  token: DexTokenDto | null;
  otherToken: DexTokenDto | null;
  amount: string;
  balance?: string;
  connected: boolean;
  pay?: boolean;
  loading?: boolean;
  disabled: boolean;
  insufficient?: boolean;
  tokens: DexTokenDto[];
  search: string;
  onSearch: (value: string) => void;
  onTokenChange: (token: DexTokenDto) => void;
  onAmountChange?: (value: string) => void;
}

const SwapAmountField = ({
  token, otherToken, amount, balance, connected, pay = false, loading = false,
  disabled, insufficient = false, tokens, search, onSearch, onTokenChange, onAmountChange,
}: Props) => {
  const { t } = useTranslation('dex');
  const id = useId();
  const updateAmount = (raw: string) => {
    const next = raw.replace(/,/g, '.');
    if (!/^\d*(?:\.\d*)?$/.test(next)) return;
    if ((next.split('.')[1]?.length || 0) > (token?.decimals ?? 18)) return;
    onAmountChange?.(next.startsWith('.') ? `0${next}` : next);
  };
  const shownAmount = pay || !amount ? amount : Decimal.from(amount).prettify(6);
  return (
    <div className={`swap-field${pay ? '' : ' swap-field--receive'}${insufficient ? ' has-error' : ''}`}>
      <label htmlFor={id}>
        {t(pay ? 'swapCard.pay' : 'swapCard.receive')}
        {!pay && <span>{t('swapCard.estimated')}</span>}
      </label>
      <div className="swap-field__main">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          dir="ltr"
          placeholder="0.00"
          value={shownAmount}
          title={!pay && amount ? amount : undefined}
          readOnly={!pay}
          disabled={disabled}
          aria-invalid={insufficient || undefined}
          onChange={(event) => updateAmount(event.target.value)}
          style={!pay && amount ? { fontSize: `clamp(15px, ${Math.min(8.3, 85 / shownAmount.length)}cqw, 27px)` } : undefined}
        />
        <TokenSelector
          variant="swap"
          labelForTrigger={t(pay ? 'swapCard.selectPay' : 'swapCard.selectReceive')}
          selected={token}
          skipToken={otherToken}
          onSelect={onTokenChange}
          tokens={tokens}
          disabled={disabled}
          loading={loading}
          searchValue={search}
          onSearchChange={onSearch}
        />
      </div>
      <div className="swap-field__meta">
        <span>
          {pay && (connected && balance !== undefined ? (
            <>
              {t('swapCard.available')}
              {' '}
              <bdi>{`${Decimal.from(balance).prettify(6)} ${token?.symbol || ''}`}</bdi>
            </>
          ) : t('swapCard.connectBalance'))}
          {!pay && token?.name}
        </span>
        {pay && connected && balance !== undefined && (
          <div>
            <button type="button" disabled={disabled || !token || !Decimal.from(balance).gt(0)} onClick={() => updateAmount(fromAettos(toAettos(balance, token?.decimals ?? 18) / 2n, token?.decimals ?? 18))}>50%</button>
            <button type="button" disabled={disabled || !token || !Decimal.from(balance).gt(0)} onClick={() => updateAmount(balance)}>{t('swapCard.max')}</button>
          </div>
        )}
        {!pay && connected && balance !== undefined && <bdi>{t('swapCard.balance', { amount: Decimal.from(balance).prettify(6) })}</bdi>}
      </div>
    </div>
  );
};
export default SwapAmountField;
