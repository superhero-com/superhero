import React from 'react';
import MobileDexCard from './MobileDexCard';
import MobileTokenSelector from './MobileTokenSelector';
import MobileDexInput from './MobileDexInput';
import MobileDexButton from './MobileDexButton';

interface Token {
  address: string;
  symbol: string;
  decimals: number;
  is_ae?: boolean;
}

interface MobileSwapFormProps {
  tokenIn?: Token;
  tokenOut?: Token;
  amountIn: string;
  amountOut: string;
  onTokenInChange: (token: Token) => void;
  onTokenOutChange: (token: Token) => void;
  onAmountInChange: (amount: string) => void;
  onAmountOutChange: (amount: string) => void;
  onSwap: () => void;
  onSwitchTokens: () => void;
  loading?: boolean;
  swapLoading?: boolean;
  error?: string;
  disabled?: boolean;
}

export default function MobileSwapForm({
  tokenIn,
  tokenOut,
  amountIn,
  amountOut,
  onTokenInChange,
  onTokenOutChange,
  onAmountInChange,
  onAmountOutChange,
  onSwap,
  onSwitchTokens,
  loading = false,
  swapLoading = false,
  error,
  disabled = false,
}: MobileSwapFormProps) {
  return (
    <MobileDexCard
      title="Swap Tokens"
      variant="elevated"
      padding="large"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Token In */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', color: '#e0e0e0' }}>From</span>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <MobileDexInput
              type="number"
              placeholder="0.0"
              value={amountIn}
              onChange={onAmountInChange}
              disabled={disabled || loading}
              size="large"
              style={{ flex: 1 }}
            />
            
            <MobileTokenSelector
              selected={tokenIn?.address}
              onSelect={(address, token) => onTokenInChange(token)}
              exclude={tokenOut ? [tokenOut.address] : []}
              disabled={disabled || loading}
              loading={loading}
            />
          </div>
        </div>

        {/* Switch Button */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <MobileDexButton
            variant="ghost"
            size="small"
            onClick={onSwitchTokens}
            disabled={disabled || loading}
          >
            ↓
          </MobileDexButton>
        </div>

        {/* Token Out */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '14px', color: '#e0e0e0' }}>To</span>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <MobileDexInput
              type="number"
              placeholder="0.0"
              value={amountOut}
              onChange={onAmountOutChange}
              disabled={disabled || loading}
              size="large"
              style={{ flex: 1 }}
            />
            
            <MobileTokenSelector
              selected={tokenOut?.address}
              onSelect={(address, token) => onTokenOutChange(token)}
              exclude={tokenIn ? [tokenIn.address] : []}
              disabled={disabled || loading}
              loading={loading}
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{ color: '#ff6b6b', fontSize: '14px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {/* Swap Button */}
        <MobileDexButton
          variant="primary"
          size="large"
          fullWidth
          onClick={onSwap}
          disabled={disabled || loading || swapLoading || !amountIn || !amountOut}
          loading={swapLoading}
        >
          {swapLoading ? 'Swapping...' : 'Swap'}
        </MobileDexButton>
      </div>
    </MobileDexCard>
  );
}
