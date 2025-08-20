import React from 'react';
import AeAmount from './AeAmount';
import FiatValue from './FiatValue';

interface Props {
  amount?: string | number;
  token?: string | null;
  noParentheses?: boolean;
  noSymbol?: boolean;
  currency?: string | null;
  round?: number;
}

export default function AeAmountFiat({
  amount = 0,
  token = null,
  noParentheses,
  noSymbol,
  currency = null,
  round,
}: Props) {
  return (
    <span className="ae-amount-fiat">
      <AeAmount amount={amount} token={token} noSymbol={noSymbol} round={round} />{' '}
      <FiatValue amount={amount} token={token} noParentheses={noParentheses} noSymbol={noSymbol} currency={currency} />
    </span>
  );
}


