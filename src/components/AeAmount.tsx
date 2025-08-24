import React from 'react';
import { formatTokenAmount, shiftDecimalPlaces } from '../utils/number';
import { useWallet } from '../../hooks';
import './AeAmount.scss';

interface Props {
  amount?: string | number;
  round?: number;
  token?: string | null;
  noSymbol?: boolean;
}

export default function AeAmount({ amount = 0, round = 2, token = null, noSymbol }: Props) {
  const { tokenInfo } = useWallet();
  const info = token ? tokenInfo[token] : null;
  const decimals = info?.decimals ?? 18;
  const symbol = info?.symbol ?? 'AE';
  const formatted = formatTokenAmount(amount, decimals, round);
  return (
    <span className="ae-amount">
      <span>{formatted}</span>
      {!noSymbol && <span className="ae">{symbol}</span>}
    </span>
  );
}


