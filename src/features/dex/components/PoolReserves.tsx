import { PairDto } from '@/api/generated';
import { Decimal } from '@/libs/decimal';

interface PoolReservesProps {
  pairData?: PairDto;
}

export const PoolReserves = ({ pairData }: PoolReservesProps) => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {/* Token 0 Reserve */}
    <div
      style={{
        padding: 18,
        borderRadius: 14,
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid var(--glass-border)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div className="text-[10px] text-white/60 mb-2 font-semibold uppercase tracking-wide flex items-center gap-1">
        🪙
        {' '}
        {pairData?.token0?.symbol || 'Token'}
        {' '}
        Reserve
      </div>
      <div className="text-lg font-bold text-white mb-0.5">
        {Decimal.fromBigNumberString(pairData?.reserve0?.toString() || '0').prettify()}
      </div>
    </div>

    {/* Token 1 Reserve */}
    <div
      style={{
        padding: 18,
        borderRadius: 14,
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid var(--glass-border)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div className="text-[10px] text-white/60 mb-2 font-semibold uppercase tracking-wide flex items-center gap-1">
        🪙
        {' '}
        {pairData?.token1?.symbol || 'Token'}
        {' '}
        Reserve
      </div>
      <div className="text-lg font-bold text-white mb-0.5">
        {Decimal.fromBigNumberString(pairData?.reserve1?.toString() || '0').prettify()}
      </div>
    </div>

    {/* LP Token Supply */}
    <div
      style={{
        padding: 18,
        borderRadius: 14,
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid var(--glass-border)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: 'var(--light-font-color)',
          marginBottom: 8,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        🎫 LP Token Supply
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 700,
          color: 'var(--standard-font-color)',
          marginBottom: 2,
        }}
      >
        {Decimal.fromBigNumberString(pairData?.total_supply?.toString() || '0').prettify()}
      </div>
      <div
        style={{
          fontSize: 11,
          color: 'var(--light-font-color)',
          fontWeight: 500,
        }}
      >
        LP tokens in circulation
      </div>
    </div>
  </div>
);
