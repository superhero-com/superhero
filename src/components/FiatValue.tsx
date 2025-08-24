import React from 'react';
import { shiftDecimalPlaces } from '../utils/number';
import { useWallet, useBackend } from '../../hooks';
import './FiatValue.scss';

interface Props {
  amount?: string | number;
  token?: string | null;
  noParentheses?: boolean;
  noSymbol?: boolean;
  currency?: string | null;
}

export default function FiatValue({
  amount = 0,
  token = null,
  noParentheses,
  noSymbol,
  currency = null,
}: Props) {
  const { selectedCurrency, tokenInfo, tokenPrices } = useWallet();
  const { prices } = useBackend();

  const showCurrency = (currency || selectedCurrency).toLowerCase();
  const rate = prices?.[showCurrency];

  if (!rate) return null;

  // Native AE by default
  const decimals = token ? tokenInfo[token]?.decimals ?? 18 : 18;
  const tokenUnitPrice = token
    ? Number(shiftDecimalPlaces(tokenPrices[token] || 0, -(tokenInfo[token]?.decimals ?? 18)))
    : 1;

  const valueNumber = Number(shiftDecimalPlaces(amount, -decimals)) * tokenUnitPrice * rate;
  const formatted = noSymbol
    ? valueNumber.toFixed(2)
    : valueNumber.toLocaleString('en-US', { style: 'currency', currency: showCurrency.toUpperCase() });

  return (
    <span className="fiat-value">
      {noParentheses ? `≈ ${formatted}` : `(≈ ${formatted})`}
    </span>
  );
}


