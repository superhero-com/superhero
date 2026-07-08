import { useTranslation } from 'react-i18next';
import { PairDto } from '@/api/generated';
import { TokenChip } from '@/components/TokenChip';
import { Decimal } from '@/libs/decimal';

interface PoolCompositionProps {
  pairData?: PairDto;
}

export const PoolComposition = ({ pairData }: PoolCompositionProps) => {
  const { t } = useTranslation('dex');
  // Calculate ratios from reserves
  const ratio1 = pairData?.reserve1 && pairData?.reserve0 && Decimal.from(pairData.reserve0).gt(0)
    ? Decimal.from(pairData.reserve1).div(pairData.reserve0)
    : Decimal.ZERO;

  const ratio0 = pairData?.reserve0 && pairData?.reserve1 && Decimal.from(pairData.reserve1).gt(0)
    ? Decimal.from(pairData.reserve0).div(pairData.reserve1)
    : Decimal.ZERO;

  return (
    <div className="liquid-glass liquid-glass--strong rounded-xl p-6 relative overflow-hidden">
      <h3 className="text-lg font-semibold text-white m-0 mb-4">
        {t('poolComposition.title')}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
        {/* Token 0 Info */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--standard-font-color)',
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <TokenChip token={pairData?.token0} />
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--standard-font-color)',
              marginBottom: 4,
              fontFamily: 'monospace',
            }}
          >
            {Decimal.fromBigNumberString(pairData?.reserve0?.toString() || '0').prettify()}
            <span className="text-xs text-white/60">
              {' '}
              {pairData?.token0?.symbol || t('tokenFallback')}
            </span>
          </div>
        </div>

        {/* Ratio Display */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div
            style={{
              fontSize: 24,
              color: 'var(--accent-color)',
              fontWeight: 700,
            }}
          >
            ⚖️
          </div>
          {pairData?.address && (
            <div
              style={{
                fontSize: 12,
                color: 'var(--light-font-color)',
                textAlign: 'center',
                lineHeight: 1.3,
              }}
            >
              1
              {' '}
              {pairData?.token0?.symbol || t('tokenFallback')}
              {' '}
              =
              {' '}
              {ratio1.prettify()}
              {' '}
              {pairData?.token1?.symbol || t('tokenFallback')}
              <br />
              1
              {pairData?.token1?.symbol || t('tokenFallback')}
              {' '}
              =
              {' '}
              {ratio0.prettify()}
              {' '}
              {pairData?.token0?.symbol || t('tokenFallback')}
            </div>
          )}
        </div>

        {/* Token 1 Info */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--standard-font-color)',
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <TokenChip token={pairData?.token1} />
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--standard-font-color)',
              marginBottom: 4,
              fontFamily: 'monospace',
            }}
          >
            {Decimal.fromBigNumberString(pairData?.reserve1?.toString() || '0').prettify()}
            <span className="text-xs text-white/60">
              {' '}
              {pairData?.token1?.symbol || t('tokenFallback')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
