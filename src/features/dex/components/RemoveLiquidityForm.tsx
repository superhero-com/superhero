import { TokenChip } from '@/components/TokenChip';
import { useEffect, useState } from 'react';
import ConnectWalletButton from '../../../components/ConnectWalletButton';
import { useTokenList } from '../../../components/dex/hooks/useTokenList';
import { useAccount, useDex } from '../../../hooks';
import { Decimal } from '../../../libs/decimal';
import { fromAettos } from '../../../libs/dex';
import { usePool } from '../context/PoolProvider';
import { useAddLiquidity } from '../hooks/useAddLiquidity';

export default function RemoveLiquidityForm() {
  const { selectedPosition, clearSelection, onPositionUpdated } = usePool();
  const { activeAccount: address } = useAccount();
  const { slippagePct, deadlineMins } = useDex();
  const { tokens } = useTokenList();
  const { executeRemoveLiquidity } = useAddLiquidity();
  
  const [percentage, setPercentage] = useState<number>(25);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [useCustomAmount, setUseCustomAmount] = useState(false);

  // Reset form when position changes
  useEffect(() => {
    setPercentage(25);
    setShowConfirm(false);
    setCustomAmount('');
    setUseCustomAmount(false);
  }, [selectedPosition]);

  // Find token info for display
  const findToken = (identifier: string) => {
    if (!identifier || !tokens.length) return null;
    return tokens.find(t => 
      t.symbol.toLowerCase() === identifier.toLowerCase() ||
      t.address === identifier ||
      (identifier.toLowerCase() === 'ae' && t.is_ae)
    );
  };

  const tokenA = findToken(selectedPosition?.token0 || '');
  const tokenB = findToken(selectedPosition?.token1 || '');

  if (!selectedPosition) {
    return (
      <div className="max-w-[min(480px,100%)] mx-auto bg-white/[0.02] border border-white/10 backdrop-blur-[20px] rounded-[24px] p-8 shadow-[0_4px_20px_rgba(0,0,0,0.1)] text-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500/10 to-red-500/20 flex items-center justify-center mx-auto mb-4 text-2xl">
          💧
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">
          Select a Position
        </h3>
        <p className="text-sm text-white/60">
          Choose a liquidity position from the list to remove liquidity
        </p>
      </div>
    );
  }

  if (!address) {
    return (
      <div className="max-w-[min(480px,100%)] mx-auto bg-white/[0.02] border border-white/10 backdrop-blur-[20px] rounded-[24px] p-8 shadow-[0_4px_20px_rgba(0,0,0,0.1)] text-center">
        <ConnectWalletButton />
      </div>
    );
  }

  const handleRemove = async () => {
    if (!address || !selectedPosition) return;
    
    setLoading(true);
    try {
      const liquidityToRemove = removeAmountForTransaction;
      
      // Debug logging to understand the balance conversion
      console.log('=== REMOVE LIQUIDITY DEBUG ===');
      console.log('selectedPosition.balance (raw):', selectedPosition.balance);
      console.log('lpAmount (converted):', lpAmount.toString());
      console.log('lpAmount (max precision):', lpAmount.toStringWithoutPrecision());
      console.log('percentage:', percentage);
      console.log('useCustomAmount:', useCustomAmount);
      console.log('removeAmount:', removeAmount.toString());
      console.log('removeAmountForTransaction:', removeAmountForTransaction);
      console.log('=====================================');
      
      // Determine if this is an AE pair
      const isAePair = selectedPosition.token0 === 'AE' || selectedPosition.token1 === 'AE';
      
      // Execute remove liquidity
      const txHash = await executeRemoveLiquidity({
        tokenA: selectedPosition.token0,
        tokenB: selectedPosition.token1,
        liquidity: liquidityToRemove,
        slippagePct,
        deadlineMins,
        isAePair,
        isFullRemoval: percentage === 100 && !useCustomAmount,
        rawBalance: percentage === 100 && !useCustomAmount ? selectedPosition.balance : undefined
      });
      
      if (txHash) {
        setLoading(false);
        setShowConfirm(false);
        clearSelection();
        
        // Refresh positions after successful transaction
        await onPositionUpdated();
      }
    } catch (error) {
      console.error('Remove liquidity failed:', error);
      setLoading(false);
    }
  };

  // selectedPosition.balance is already in correct LP token format (string of bigint aettos)
  // LP tokens have 18 decimals, so we need to convert from aettos to decimal representation
  const lpAmount = selectedPosition.balance ? Decimal.from(fromAettos(selectedPosition.balance, 18)) : Decimal.from('0');
  const removeAmount = useCustomAmount 
    ? Decimal.from(customAmount || '0')
    : percentage === 100 
      ? lpAmount  // Use exact balance for 100% to avoid precision loss
      : lpAmount.mul(percentage).div(100);
  
  // For 100% removal, bypass conversion completely by using the raw balance
  const removeAmountForTransaction = useCustomAmount 
    ? customAmount 
    : percentage === 100 
      ? fromAettos(selectedPosition.balance, 18)  // Convert raw balance directly to avoid any precision loss
      // ? selectedPosition.balance
      : removeAmount.toString();
  
  const estimatedValueUsd = selectedPosition.valueUsd 
    ? Decimal.from(selectedPosition.valueUsd).mul(useCustomAmount 
        ? (Number(customAmount) / Number(lpAmount.toString())) * 100 
        : percentage).div(100)
    : null;

  const percentageButtons = [25, 50, 75, 100];

  if (showConfirm) {
    return (
      <div className="max-w-[min(480px,100%)] mx-auto bg-white/[0.02] border border-white/10 backdrop-blur-[20px] rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500/10 to-red-500/20 flex items-center justify-center text-lg">
              💧
            </div>
            <div>
              <h2 className="text-xl font-bold m-0 sh-dex-title">
                Confirm Removal
              </h2>
              <p className="text-xs text-white/60 mt-0.5">
                Review your transaction
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowConfirm(false)}
            className="w-8 h-8 rounded-full border border-white/10 bg-white/[0.02] text-white/60 cursor-pointer flex items-center justify-center text-sm transition-all duration-200 hover:bg-[#4ecdc4] hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Transaction Details */}
        <div className="p-5 bg-white/[0.05] rounded-2xl border border-white/10 mb-6 backdrop-blur-[10px]">
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-white/60">
                Removing from Pool
              </span>
            </div>
            <div className="flex items-center gap-2">
            <TokenChip address={selectedPosition.token0} />
              {/* <AddressChip address={selectedPosition.token0} hideAvatar /> */}
              <span className="text-white/60 text-xs">+</span>
              <TokenChip address={selectedPosition.token1} />
              {/* <AddressChip address={selectedPosition.token1} hideAvatar /> */}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 bg-white/[0.02] rounded-xl border border-white/10">
            <div>
              <div className="text-xs text-white/60 mb-1">
                LP Tokens to Remove
              </div>
              <div className="text-base font-semibold text-white">
                {percentage === 100 && !useCustomAmount 
                  ? lpAmount.prettifyWithMaxPrecision() 
                  : removeAmount.prettify()}
              </div>
            </div>
            <div>
              <div className="text-xs text-white/60 mb-1">
                Percentage
              </div>
              <div className="text-base font-semibold text-[#4ecdc4]">
                {useCustomAmount 
                  ? `${((Number(customAmount) / Number(lpAmount.toString())) * 100).toFixed(1)}%`
                  : `${percentage}%`
                }
              </div>
            </div>
          </div>

          {estimatedValueUsd && (
            <div className="mt-3 p-3 bg-gradient-to-r from-green-500/10 to-green-500/5 rounded-lg border border-green-500/20 text-center">
              <div className="text-xs text-white/60 mb-0.5">
                Estimated Value
              </div>
              <div className="text-lg font-bold text-green-400">
                ${estimatedValueUsd.prettify()}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => setShowConfirm(false)}
            className="flex-1 px-6 py-4 rounded-2xl border border-white/10 bg-white/[0.02] text-white cursor-pointer text-base font-semibold transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] backdrop-blur-[10px] hover:bg-white/10 hover:-translate-y-0.5 active:translate-y-0"
          >
            Cancel
          </button>
          <button
            onClick={handleRemove}
            disabled={loading}
            className={`flex-[2] px-6 py-4 rounded-2xl border-none text-white cursor-pointer text-base font-bold tracking-wider uppercase transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
              loading 
                ? 'bg-white/10 cursor-not-allowed opacity-60' 
                : 'bg-[#1161FE] shadow-[0_8px_25px_rgba(17,97,254,0.4)] hover:shadow-[0_12px_35px_rgba(17,97,254,0.5)] hover:-translate-y-0.5 active:translate-y-0'
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Removing...
              </div>
            ) : '🔥 Remove Liquidity'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[min(480px,100%)] mx-auto bg-white/[0.02] border border-white/10 backdrop-blur-[20px] rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500/10 to-red-500/20 flex items-center justify-center text-lg">
            💧
          </div>
          <div>
            <h2 className="text-xl font-bold m-0 sh-dex-title">
              Remove Liquidity
            </h2>
            <p className="text-xs text-white/60 mt-0.5">
              Remove tokens from pool
            </p>
          </div>
        </div>
        <button
          onClick={clearSelection}
          className="w-8 h-8 rounded-full border border-white/10 bg-white/[0.02] text-white/60 cursor-pointer flex items-center justify-center text-sm transition-all duration-200 hover:bg-[#4ecdc4] hover:text-white"
        >
          ✕
        </button>
      </div>

      {/* Selected Position Info */}
      <div className="p-4 bg-white/[0.05] rounded-2xl border border-white/10 mb-6 backdrop-blur-[10px]">
        <div className="flex flex-row flex-wrap justify-between items-center mb-3">
          <span className="text-sm text-white/60">
            Position
          </span>
          <div className="flex items-center gap-2">
            <TokenChip address={selectedPosition.token0} />
            <span className="text-white/60 text-xs">+</span>
            <TokenChip address={selectedPosition.token1} />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-white/60 mb-0.5">
              LP Balance
            </div>
            <div className="text-white font-semibold">
              {lpAmount.prettify()}
            </div>
          </div>
          {selectedPosition.valueUsd && (
            <div>
              <div className="text-white/60 mb-0.5">
                Total Value
              </div>
              <div className="text-green-400 font-semibold">
                ${Decimal.from(selectedPosition.valueUsd).prettify()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Amount Selection */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <label className="text-sm font-semibold text-white">
            Amount to Remove
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setUseCustomAmount(false)}
              className={`px-2 py-1 rounded-lg border cursor-pointer text-xs font-medium transition-all duration-200 ${
                useCustomAmount 
                  ? 'border-white/10 bg-white/[0.02] text-white/60' 
                  : 'border-[#4ecdc4] bg-[#4ecdc4] text-white'
              }`}
            >
              %
            </button>
            <button
              onClick={() => setUseCustomAmount(true)}
              className={`px-2 py-1 rounded-lg border cursor-pointer text-xs font-medium transition-all duration-200 ${
                !useCustomAmount 
                  ? 'border-white/10 bg-white/[0.02] text-white/60' 
                  : 'border-[#4ecdc4] bg-[#4ecdc4] text-white'
              }`}
            >
              LP
            </button>
          </div>
        </div>

        {!useCustomAmount ? (
          <>
            {/* Percentage Buttons */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {percentageButtons.map((pct) => (
                <button
                  key={pct}
                  onClick={() => setPercentage(pct)}
                  className={`py-3 px-2 rounded-xl border cursor-pointer text-sm font-semibold transition-all duration-200 backdrop-blur-sm ${
                    percentage === pct 
                      ? 'border-[#4ecdc4] bg-[#4ecdc4] text-white' 
                      : 'border-white/10 bg-white/[0.02] text-white hover:bg-white/10'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>

            {/* Percentage Slider */}
            <div className="p-4 bg-white/[0.02] rounded-xl border border-white/10">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-white/60">
                  Slide to adjust
                </span>
                <span className="text-base font-bold text-[#4ecdc4]">
                  {percentage}%
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={percentage}
                onChange={(e) => setPercentage(Number(e.target.value))}
                className="w-full h-1.5 rounded-sm outline-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #4ecdc4 0%, #4ecdc4 ${percentage}%, rgba(255,255,255,0.1) ${percentage}%, rgba(255,255,255,0.1) 100%)`
                }}
              />
            </div>
          </>
        ) : (
          /* Custom Amount Input */
          <div className="p-4 bg-white/[0.02] rounded-xl border border-white/10">
            <div className="mb-2">
              <span className="text-xs text-white/60">
                LP Tokens to Remove
              </span>
            </div>
            <input
              type="number"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="0.0"
              max={lpAmount.toString()}
              className="w-full py-3 border-none bg-transparent text-white text-lg font-semibold outline-none"
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-white/60">
                Max: {lpAmount.prettify()}
              </span>
              <button
                onClick={() => setCustomAmount(lpAmount.toString())}
                className="px-2 py-1 rounded-md border border-[#4ecdc4] bg-transparent text-[#4ecdc4] cursor-pointer text-xs font-medium hover:bg-[#4ecdc4] hover:text-white transition-all duration-200"
              >
                MAX
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Remove Summary */}
      <div className="p-4 bg-gradient-to-br from-red-500/5 to-yellow-500/5 rounded-2xl border border-red-500/20 mb-6">
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <div className="text-xs text-white/60 mb-1">
              LP Tokens to Remove
            </div>
            <div className="text-base font-semibold text-white">
              {percentage === 100 && !useCustomAmount 
                ? lpAmount.prettifyWithMaxPrecision() 
                : removeAmount.prettify(12)}
            </div>
          </div>
          <div>
            <div className="text-xs text-white/60 mb-1">
              Percentage
            </div>
            <div className="text-base font-semibold text-[#4ecdc4]">
              {useCustomAmount 
                ? `${((Number(customAmount || '0') / Number(lpAmount.toString())) * 100).toFixed(1)}%`
                : `${percentage}%`
              }
            </div>
          </div>
        </div>

        {estimatedValueUsd && (
          <div className="text-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
            <div className="text-xs text-white/60 mb-1">
              Estimated Value
            </div>
            <div className="text-xl font-bold text-green-400">
              ${estimatedValueUsd.prettify()}
            </div>
          </div>
        )}
      </div>

      {/* Remove Button */}
      <button
        onClick={() => setShowConfirm(true)}
        disabled={removeAmount.lte(0) || (useCustomAmount && (!customAmount || Number(customAmount) <= 0))}
        className={`w-full py-4 px-6 rounded-2xl border-none text-base font-bold tracking-wider uppercase transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          removeAmount.lte(0) || (useCustomAmount && (!customAmount || Number(customAmount) <= 0))
            ? 'bg-white/10 text-white/60 cursor-not-allowed opacity-60'
            : 'bg-[#1161FE] text-white cursor-pointer shadow-[0_8px_25px_rgba(17,97,254,0.4)] hover:shadow-[0_12px_35px_rgba(17,97,254,0.5)] hover:-translate-y-0.5 active:translate-y-0'
        }`}
      >
        💧 Remove {useCustomAmount 
          ? `${((Number(customAmount || '0') / Number(lpAmount.toString())) * 100).toFixed(1)}%`
          : `${percentage}%`
        } Liquidity
      </button>
    </div>
  );
}