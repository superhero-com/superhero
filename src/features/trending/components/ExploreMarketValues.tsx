import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toAe } from '@aeternity/aepp-sdk';
import type { TokenDto } from '@/api/generated/models/TokenDto';
import type { PerformancePeriodDto } from '@/api/generated/models/PerformancePeriodDto';
import { PriceDataFormatter } from '@/features/shared/components';
import { Decimal } from '@/libs/decimal';
import { TokenLineChart } from './TokenLineChart';

export const tokenMarketHref = (token: TokenDto) => (
  `/trending/tokens/${encodeURIComponent(token.name || token.address)}`
);

export const MarketChange = ({ period }: { period?: PerformancePeriodDto | null }) => {
  const percent = period?.current_change_percent;
  if (percent == null || !Number.isFinite(percent)) {
    return <span className="market-change is-empty">—</span>;
  }
  const up = period?.current_change_direction === 'up'
    || (period?.current_change_direction !== 'down' && percent >= 0);
  return (
    <span className={`market-change ${up ? 'is-up' : 'is-down'}`} dir="ltr">
      {up ? '+' : '−'}
      {Decimal.from(Math.abs(percent)).prettify(2)}
      %
    </span>
  );
};

export const MarketPrice = ({ token }: { token: TokenDto }) => (
  token.price_data?.ae == null ? <span className="is-empty">—</span> : (
    <div dir="ltr" className="market-price-value">
      <PriceDataFormatter hideFiatPrice hideSymbol priceData={token.price_data} />
    </div>
  )
);

export const MarketAmount = ({ value, aettos = false, unit }: {
  value?: string | number | null;
  aettos?: boolean;
  unit?: string;
}) => {
  if (value == null || value === '') return <span className="is-empty">—</span>;
  const amount = Decimal.from(aettos ? toAe(value) : value);
  return (
    <bdi title={`${amount.prettifyWithMaxPrecision()}${unit ? ` ${unit}` : ''}`}>
      {amount.shorten()}
      {unit && (
      <>
        {' '}
        <small>{unit}</small>
      </>
      )}
    </bdi>
  );
};

// The API includes volume in the period payload, ahead of the generated DTO.
export const marketVolume = (token: TokenDto) => {
  const period = token.performance?.past_30d as
    | (PerformancePeriodDto & { volume?: string | number })
    | null;
  return period?.volume;
};

export const MarketHistory = ({ token, large = false }: {
  token: TokenDto; large?: boolean;
}) => {
  const { t } = useTranslation('trending');
  const address = token.sale_address || token.address;
  const [failedAddress, setFailedAddress] = useState<string | null>(null);
  const unavailable = !address || failedAddress === address;
  return (
    <div
      className={`market-history${large ? ' market-history--large' : ''}`}
      onErrorCapture={() => setFailedAddress(address)}
    >
      {unavailable ? (
        <span className="market-history__empty" title={t('market.noHistory')}>
          {large ? t('market.noHistory') : '—'}
        </span>
      ) : (
        <TokenLineChart
          saleAddress={address}
          height={large ? 76 : 40}
          width={large ? 360 : 128}
          interval="all-time"
        />
      )}
    </div>
  );
};
