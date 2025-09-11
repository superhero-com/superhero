import { toAe } from '@aeternity/aepp-sdk';
import { useEffect, useState } from 'react';
import AddressChip from '../../../components/AddressChip';
import ConnectWalletButton from '../../../components/ConnectWalletButton';
import { useTokenList } from '../../../components/dex/hooks/useTokenList';
import { useAccount, useDex } from '../../../hooks';
import { Decimal } from '../../../libs/decimal';
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
      <div className="max-w-[480px] mx-auto bg-glass-bg border border-glass-border backdrop-blur-xl rounded-3xl p-8 shadow-glass text-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500/10 to-red-500/20 flex items-center justify-center mx-auto mb-4 text-2xl">
          💧
        </div>
        <h3 className="text-lg font-semibold text-standard-font-color mb-2">
          Select a Position
        </h3>
        <p className="text-sm text-light-font-color">
          Choose a liquidity position from the list to remove liquidity
        </p>
      </div>
    );
  }

  if (!address) {
    return (
      <div className="max-w-[480px] mx-auto bg-glass-bg border border-glass-border backdrop-blur-xl rounded-3xl p-8 shadow-glass text-center">
        <ConnectWalletButton />
      </div>
    );
  }

  const handleRemove = async () => {
    if (!address || !selectedPosition) return;
    
    setLoading(true);
    try {
      const liquidityToRemove = useCustomAmount ? customAmount : removeAmount.toString();
      
      // Determine if this is an AE pair
      const isAePair = selectedPosition.token0 === 'AE' || selectedPosition.token1 === 'AE';
      
      // Execute remove liquidity
      const txHash = await executeRemoveLiquidity({
        tokenA: selectedPosition.token0,
        tokenB: selectedPosition.token1,
        liquidity: liquidityToRemove,
        slippagePct,
        deadlineMins,
        isAePair
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

  const lpAmount = selectedPosition.balance ? Decimal.from(toAe(selectedPosition.balance)) : Decimal.from('0');
  const removeAmount = useCustomAmount 
    ? Decimal.from(customAmount || '0')
    : percentage === 100 
      ? lpAmount  // Use exact balance for 100% to avoid precision loss
      : lpAmount.mul(percentage).div(100);
  
  const estimatedValueUsd = selectedPosition.valueUsd 
    ? Decimal.from(selectedPosition.valueUsd).mul(useCustomAmount 
        ? (Number(customAmount) / Number(lpAmount.toString())) * 100 
        : percentage).div(100)
    : null;

  const percentageButtons = [25, 50, 75, 100];

  if (showConfirm) {
    return (
      <div className="max-w-[480px] mx-auto bg-glass-bg border border-glass-border backdrop-blur-xl rounded-3xl p-6 shadow-glass">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500/10 to-red-500/20 flex items-center justify-center text-lg">
              💧
            </div>
            <div>
              <h2 className="text-xl font-bold text-standard-font-color m-0 bg-gradient-to-r from-red-400 to-yellow-400 bg-clip-text text-transparent">
                Confirm Removal
              </h2>
              <p className="text-xs text-light-font-color mt-0.5">
                Review your transaction
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowConfirm(false)}
            className="w-8 h-8 rounded-full border border-glass-border bg-glass-bg text-light-font-color cursor-pointer flex items-center justify-center text-sm transition-all duration-200 hover:bg-accent-color hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Transaction Details */}
        <div className="p-5 bg-white/[0.03] rounded-2xl border border-glass-border mb-6">
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-light-font-color">
                Removing from Pool
              </span>
            </div>
            <div className="flex items-center gap-2">
              <AddressChip address={selectedPosition.token0} hideAvatar />
              <span className="text-light-font-color text-xs">+</span>
              <AddressChip address={selectedPosition.token1} hideAvatar />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 p-4 bg-white/[0.02] rounded-xl border border-white/[0.05]">
            <div>
              <div className="text-xs text-light-font-color mb-1">
                LP Tokens to Remove
              </div>
              <div className="text-base font-semibold text-standard-font-color">
                {removeAmount.prettify()}
              </div>
            </div>
            <div>
              <div className="text-xs text-light-font-color mb-1">
                Percentage
              </div>
              <div className="text-base font-semibold text-accent-color">
                {useCustomAmount 
                  ? `${((Number(customAmount) / Number(lpAmount.toString())) * 100).toFixed(1)}%`
                  : `${percentage}%`
                }
              </div>
            </div>
          </div>

          {estimatedValueUsd && (
            <div className="mt-3 p-3 bg-gradient-to-r from-green-500/10 to-green-500/5 rounded-lg border border-green-500/20 text-center">
              <div className="text-xs text-light-font-color mb-0.5">
                Estimated Value
              </div>
              <div className="text-lg font-bold text-success-color">
                ${estimatedValueUsd.prettify()}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => setShowConfirm(false)}
            className="flex-1 px-6 py-4 rounded-2xl border border-glass-border bg-glass-bg text-standard-font-color cursor-pointer text-base font-semibold transition-all duration-300 backdrop-blur-sm hover:bg-white/10 hover:-translate-y-0.5"
          >
            Cancel
          </button>
          <button
            onClick={handleRemove}
            disabled={loading}
            className={`flex-[2] px-6 py-4 rounded-2xl border-none text-white cursor-pointer text-base font-bold tracking-wider uppercase transition-all duration-300 ${
              loading 
                ? 'bg-glass-bg cursor-not-allowed opacity-70' 
                : 'bg-gradient-to-r from-red-400 to-yellow-400 shadow-[0_8px_32px_rgba(255,107,107,0.3)] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(255,107,107,0.4)]'
            }`}
          >
            {loading ? '⏳ Removing...' : '🔥 Remove Liquidity'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[480px] mx-auto bg-glass-bg border border-glass-border backdrop-blur-xl rounded-3xl p-6 shadow-glass">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500/10 to-red-500/20 flex items-center justify-center text-lg">
            💧
          </div>
          <div>
            <h2 className="text-xl font-bold text-standard-font-color m-0 bg-gradient-to-r from-red-400 to-yellow-400 bg-clip-text text-transparent">
              Remove Liquidity
            </h2>
            <p className="text-xs text-light-font-color mt-0.5">
              Remove tokens from pool
            </p>
          </div>
        </div>
        <button
          onClick={clearSelection}
          className="w-8 h-8 rounded-full border border-glass-border bg-glass-bg text-light-font-color cursor-pointer flex items-center justify-center text-sm transition-all duration-200 hover:bg-accent-color hover:text-white"
        >
          ✕
        </button>
      </div>

      {/* Selected Position Info */}
      <div className="p-4 bg-white/[0.03] rounded-2xl border border-glass-border mb-6">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm text-light-font-color">
            Position
          </span>
          <div className="flex items-center gap-2">
            <AddressChip address={selectedPosition.token0} hideAvatar />
            <span className="text-light-font-color text-xs">+</span>
            <AddressChip address={selectedPosition.token1} hideAvatar />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="text-light-font-color mb-0.5">
              LP Balance
            </div>
            <div className="text-standard-font-color font-semibold">
              {lpAmount.prettify()}
            </div>
          </div>
          {selectedPosition.valueUsd && (
            <div>
              <div className="text-light-font-color mb-0.5">
                Total Value
              </div>
              <div className="text-success-color font-semibold">
                ${Decimal.from(selectedPosition.valueUsd).prettify()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Amount Selection */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <label className="text-sm font-semibold text-standard-font-color">
            Amount to Remove
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setUseCustomAmount(false)}
              className={`px-2 py-1 rounded-lg border cursor-pointer text-xs font-medium ${
                useCustomAmount 
                  ? 'border-glass-border bg-glass-bg text-light-font-color' 
                  : 'border-accent-color bg-accent-color text-white'
              }`}
            >
              %
            </button>
            <button
              onClick={() => setUseCustomAmount(true)}
              className={`px-2 py-1 rounded-lg border cursor-pointer text-xs font-medium ${
                !useCustomAmount 
                  ? 'border-glass-border bg-glass-bg text-light-font-color' 
                  : 'border-accent-color bg-accent-color text-white'
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
                      ? 'border-accent-color bg-accent-color text-white' 
                      : 'border-glass-border bg-glass-bg text-standard-font-color hover:bg-white/10'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>

            {/* Percentage Slider */}
            <div className="p-4 bg-white/[0.02] rounded-xl border border-glass-border">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-light-font-color">
                  Slide to adjust
                </span>
                <span className="text-base font-bold text-accent-color">
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
                  background: `linear-gradient(to right, var(--accent-color) 0%, var(--accent-color) ${percentage}%, var(--glass-border) ${percentage}%, var(--glass-border) 100%)`
                }}
              />
            </div>
          </>
        ) : (
          /* Custom Amount Input */
          <div style={{
            padding: 16,
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: 12,
            border: '1px solid var(--glass-border)'
          }}>
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--light-font-color)' }}>
                LP Tokens to Remove
              </span>
            </div>
            <input
              type="number"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="0.0"
              max={lpAmount.toString()}
              style={{
                width: '100%',
                padding: '12px 0',
                border: 'none',
                background: 'transparent',
                color: 'var(--standard-font-color)',
                fontSize: 18,
                fontWeight: 600,
                outline: 'none'
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 8
            }}>
              <span style={{ fontSize: 12, color: 'var(--light-font-color)' }}>
                Max: {lpAmount.prettify()}
              </span>
              <button
                onClick={() => setCustomAmount(lpAmount.toString())}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: '1px solid var(--accent-color)',
                  background: 'transparent',
                  color: 'var(--accent-color)',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 500
                }}
              >
                MAX
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Remove Summary */}
      <div style={{
        padding: 16,
        background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.05), rgba(254, 202, 87, 0.05))',
        borderRadius: 16,
        border: '1px solid rgba(255, 107, 107, 0.2)',
        marginBottom: 24
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginBottom: estimatedValueUsd ? 12 : 0
        }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--light-font-color)', marginBottom: 4 }}>
              LP Tokens to Remove
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--standard-font-color)' }}>
              {removeAmount.prettify()}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--light-font-color)', marginBottom: 4 }}>
              Percentage
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--accent-color)' }}>
              {useCustomAmount 
                ? `${((Number(customAmount || '0') / Number(lpAmount.toString())) * 100).toFixed(1)}%`
                : `${percentage}%`
              }
            </div>
          </div>
        </div>

        {estimatedValueUsd && (
          <div style={{
            textAlign: 'center',
            padding: 12,
            background: 'rgba(76, 175, 80, 0.1)',
            borderRadius: 8,
            border: '1px solid rgba(76, 175, 80, 0.2)'
          }}>
            <div style={{ fontSize: 12, color: 'var(--light-font-color)', marginBottom: 2 }}>
              Estimated Value
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--success-color)' }}>
              ${estimatedValueUsd.prettify()}
            </div>
          </div>
        )}
      </div>

      {/* Remove Button */}
      <button
        onClick={() => setShowConfirm(true)}
        disabled={removeAmount.lte(0) || (useCustomAmount && (!customAmount || Number(customAmount) <= 0))}
        className={`w-full px-6 py-4 rounded-2xl border-none text-base font-bold tracking-wider uppercase transition-all duration-300 ${
          removeAmount.lte(0) || (useCustomAmount && (!customAmount || Number(customAmount) <= 0))
            ? 'bg-glass-bg text-light-font-color cursor-not-allowed opacity-50'
            : 'bg-gradient-to-r from-red-400 to-yellow-400 text-white cursor-pointer shadow-[0_8px_32px_rgba(255,107,107,0.3)] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(255,107,107,0.4)]'
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