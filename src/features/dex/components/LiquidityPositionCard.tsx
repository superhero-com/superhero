import { toAe } from '@aeternity/aepp-sdk';
import { AddressChip } from '../../../components/AddressChip';
import { TokenChip } from '../../../components/TokenChip';
import { Decimal } from '../../../libs/decimal';
import { usePool } from '../context/PoolProvider';
import { LiquidityPosition } from '../types/pool';

interface LiquidityPositionCardProps {
  position: LiquidityPosition;
  onRemove?: (position: LiquidityPosition) => void;
  onAdd?: (position: LiquidityPosition) => void;
}

const LiquidityPositionCard = ({
  position,
  onRemove,
  onAdd,
}: LiquidityPositionCardProps) => {
  const { selectedPosition } = usePool();
  const isSelected = selectedPosition?.pair.address === position.pair.address;

  return (
    <div
      className={`flex justify-between flex-col p-4 gap-2 rounded-2xl backdrop-blur-sm transition-all duration-300 ${isSelected
        ? 'bg-red-500/10 border border-accent-color'
        : 'bg-white/[0.05] border border-glass-border'
      }`}
    >
      <div className="flex-col md:flex-row flex gap-3 mb-2 ">
        <div className="flex items-center gap-3 mb-2 ">
          <div className="text-base font-semibold text-standard-font-color flex items-center gap-1">
            <TokenChip token={position.pair.token0} />
            <span className="text-lg text-light-font-color">/</span>
            <TokenChip token={position.pair.token1} />
          </div>
        </div>
        <div className="flex items-center gap-3 mb-2 ">
          <div className="text-[10px] text-light-font-color">View Pair:</div>
          <AddressChip
            address={position.pair.address}
            copyable
            linkToExplorer
            hideAvatar
            className="text-[10px] mb-2"
          />
        </div>
      </div>
      <div className="flex flex-row flex-wrap justify-between items-center ">
        <div className="flex-col flex-wrap gap-2 text-xs text-light-font-color mb-2">

          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider opacity-70">
              LP Tokens
            </span>
            <span className="font-semibold text-standard-font-color">
              {Decimal.from(toAe(position.balance ?? '0')).prettify()}
            </span>
          </div>
          {position.sharePct && (
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] uppercase tracking-wider opacity-70">
                Pool Share
              </span>
              <span className="font-semibold text-standard-font-color">
                {Decimal.from(position.sharePct ?? '0').prettify()}
                %
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {onAdd && (
            <button
              type="button"
              onClick={() => onAdd(position)}
              className="px-4 py-2 rounded-xl border border-glass-border bg-glass-bg text-standard-font-color cursor-pointer text-xs font-medium backdrop-blur-sm transition-all duration-300 hover:bg-accent-color hover:-translate-y-0.5"
            >
              + Add
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(position)}
              className="px-4 py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-error-color cursor-pointer text-xs font-medium backdrop-blur-sm transition-all duration-300 hover:bg-red-500/20 hover:-translate-y-0.5"
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiquidityPositionCard;
