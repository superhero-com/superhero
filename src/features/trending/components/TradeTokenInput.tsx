import { ArrowDownUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TokenDto } from '@/api/generated/models/TokenDto';
import { useCurrencies } from '@/hooks/useCurrencies';
import { Decimal } from '@/libs/decimal';
import TokenTradeAmount from './TokenTradeAmount';

interface TradeTokenInputProps {
  token?: TokenDto;
  tokenA?: number;
  tokenB?: number;
  isBuying: boolean;
  userBalance: string;
  spendableAeBalance: Decimal;
  onTokenAChange: (value: number | undefined) => void;
  onTokenBChange: (value: number | undefined) => void;
  onTokenAFocus: () => void;
  onTokenBFocus: () => void;
  onToggleTradeView: () => void;
  readonly?: boolean;
  isInsufficientBalance?: boolean;
  connected?: boolean;
}

const TradeTokenInput = ({
  token, tokenA, tokenB, isBuying, userBalance, spendableAeBalance,
  onTokenAChange, onTokenBChange, onTokenAFocus, onTokenBFocus, onToggleTradeView,
  readonly = false, isInsufficientBalance = false, connected = false,
}: TradeTokenInputProps) => {
  const { t } = useTranslation('trending');
  const {
    getFiat, currentCurrencyInfo, currentCurrencyCode, currentCurrencyRate,
  } = useCurrencies();
  if (!token?.sale_address) return null;
  // Display-only fiat estimate; the existing trade hook owns bonding-curve quotes.
  const aeValue = isBuying ? Decimal.from(tokenA || 0) : Decimal.from(tokenB || 0);
  const fiat = aeValue.gt(0) && currentCurrencyRate > 0
    ? `≈ ${currentCurrencyInfo.symbol}${getFiat(aeValue).prettifyWithMaxPrecision()} ${currentCurrencyCode.toUpperCase()}`
    : undefined;
  const symbol = token.symbol || token.name;
  return (
    <div className="trade-amounts" key={`${token.sale_address}:${isBuying}`}>
      <TokenTradeAmount
        pay
        value={tokenA}
        onChange={onTokenAChange}
        onFocus={onTokenAFocus}
        symbol={symbol}
        ae={isBuying}
        balance={isBuying ? spendableAeBalance.toStringWithoutPrecision() : userBalance}
        connected={connected}
        disabled={readonly}
        insufficient={connected && isInsufficientBalance}
      />
      <div className="trade-switch-wrap">
        <button type="button" className="trade-switch" disabled={readonly} onClick={onToggleTradeView} aria-label={t('tradePanel.swap')}>
          <ArrowDownUp aria-hidden="true" />
        </button>
      </div>
      <TokenTradeAmount
        value={tokenB}
        onChange={onTokenBChange}
        onFocus={onTokenBFocus}
        symbol={symbol}
        ae={!isBuying}
        balance={isBuying ? userBalance : spendableAeBalance.toStringWithoutPrecision()}
        connected={connected}
        disabled={readonly}
        fiat={fiat}
      />
    </div>
  );
};
export default TradeTokenInput;
