import { toAe } from '@aeternity/aepp-sdk';
import AddressChip from '../../../components/AddressChip';
import { TokenChip } from '../../../components/TokenChip';
import { Decimal } from '../../../libs/decimal';
import { usePool } from '../context/PoolProvider';
import { LiquidityPosition } from '../types/pool';

interface LiquidityPositionCardProps {
  position: LiquidityPosition;
  onRemove?: (pairId: string) => void;
  onAdd?: (pairId: string) => void;
}

export default function LiquidityPositionCard({
  position,
  onRemove,
  onAdd
}: LiquidityPositionCardProps) {
  const { currentAction, selectedPosition } = usePool();
  const isSelected = selectedPosition?.pairId === position.pairId;
  
  return (
    <div className={`flex justify-between items-center p-4 rounded-2xl backdrop-blur-sm transition-all duration-300 ${
      isSelected 
        ? 'bg-red-500/10 border border-accent-color' 
        : 'bg-white/[0.05] border border-glass-border'
    }`}>
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <div className="text-base font-semibold text-standard-font-color flex items-center gap-1">
            <TokenChip address={position.token0} />
            <span className="text-lg text-light-font-color">
              /
            </span>
            <TokenChip address={position.token1} />
          </div>
          {position.valueUsd && (
            <div className="text-xs text-success-color font-semibold px-2 py-1 rounded-lg bg-green-500/10 border border-green-500/20">
              ${Decimal.from(position.valueUsd ?? '0').prettify()}
            </div>
          )}
          <span className="text-[10px] text-light-font-color">
            View Pair
          </span>
          <AddressChip
            address={position.pairId}
            copyable
            linkToExplorer
            hideAvatar
            className="text-[10px]"
          />
        </div>

        <div className="flex gap-5 text-xs text-light-font-color">
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
                {Decimal.from(position.sharePct ?? '0').prettify()}%
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        {onAdd && (
          <button
            onClick={() => onAdd(position.pairId)}
            className="px-4 py-2 rounded-xl border border-glass-border bg-glass-bg text-standard-font-color cursor-pointer text-xs font-medium backdrop-blur-sm transition-all duration-300 hover:bg-accent-color hover:-translate-y-0.5"
          >
            + Add
          </button>
        )}
        {onRemove && (
          <button
            onClick={() => onRemove(position.pairId)}
            className="px-4 py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-error-color cursor-pointer text-xs font-medium backdrop-blur-sm transition-all duration-300 hover:bg-red-500/20 hover:-translate-y-0.5"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
