import { PairDto } from '@/api/generated';
import { AddressChip } from '@/components/AddressChip';
import AeButton from '@/components/AeButton';
import { TokenChip } from '@/components/TokenChip';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface PoolHeaderProps {
  pairData?: PairDto;
}

export const PoolHeader = ({ pairData }: PoolHeaderProps) => {
  const { t } = useTranslation('dex');
  const navigate = useNavigate();

  return (
    <>
      {/* Header */}
      <div>
        <h1 className="text-[28px] font-bold m-0 mb-2 flex items-center gap-2">
          <TokenChip token={pairData?.token0} />
          <span className="text-2xl text-white/60">/</span>
          <TokenChip token={pairData?.token1} />
        </h1>
        <p className="text-sm text-white/60 mt-2 mb-0 leading-relaxed">
          {t('poolHeader.detailsAndStatistics')}
        </p>
        <div className="text-xs text-white/60 font-mono opacity-70 mt-1">
          <AddressChip address={pairData?.address || ''} />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        <AeButton
          onClick={() => navigate(
            `/defi/swap?from=${pairData?.token0?.address}&to=${pairData?.token1?.address}`,
          )}
          variant="secondary-dark"
          size="medium"
          className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 border-0 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          {t('swapButton')}
        </AeButton>
        <AeButton
          onClick={() => navigate(
            `/defi/pool?from=${pairData?.token0?.address}&to=${pairData?.token1?.address}`,
          )}
          variant="secondary-dark"
          size="medium"
          className="bg-gradient-brand-135 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          {t('addLiquidityForm.title')}
        </AeButton>
        <AeButton
          onClick={() => navigate(`/defi/explore/tokens/${pairData?.token0?.address}`)}
          variant="secondary-dark"
          size="medium"
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-0 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          {t('poolHeader.viewToken', { symbol: pairData?.token0?.symbol || t('bridge.token') })}
        </AeButton>
        <AeButton
          onClick={() => navigate(`/defi/explore/tokens/${pairData?.token1?.address}`)}
          variant="secondary-dark"
          size="medium"
          className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 border-0 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          {t('poolHeader.viewToken', { symbol: pairData?.token1?.symbol || t('bridge.token') })}
        </AeButton>
      </div>
    </>
  );
};
