import React from 'react';
import ConnectWalletButton from '../../ConnectWalletButton';
import TokenSelector from '../../dex/TokenSelector';
import { useAddLiquidity } from '../hooks/useAddLiquidity';
import { CONFIG } from '../../../config';

import { useWallet } from '../../hooks';
export default function AddLiquidityForm() {
  const address = useWallet().address;
  const { state, setState, executeAddLiquidity } = useAddLiquidity();

  const handleAmountChange = (field: 'amountA' | 'amountB') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setState(prev => ({ ...prev, [field]: value }));
  };

  const handleTokenChange = (field: 'tokenA' | 'tokenB') => (token: any) => {
    setState(prev => ({ ...prev, [field]: token.contractId || token.address || token }));
  };

  const handleSubmit = async () => {
    if (!state.tokenA || !state.tokenB || !state.amountA || !state.amountB) {
      return;
    }

    try {
      await executeAddLiquidity({
        tokenA: state.tokenA,
        tokenB: state.tokenB,
        amountA: state.amountA,
        amountB: state.amountB,
        slippagePct: 0.5, // Default slippage
        deadlineMins: 20, // Default deadline
        isAePair: state.tokenA === 'AE' || state.tokenB === 'AE',
      });
    } catch (error) {
      console.error('Add liquidity failed:', error);
    }
  };

  return (
    <div style={{ 
      display: 'grid', 
      gap: 16, 
      border: '1px solid #3a3a4a', 
      padding: 20, 
      borderRadius: 12, 
      background: '#14141c' 
    }}>
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: 20, fontWeight: 600, color: 'white' }}>
          Add Liquidity
        </h3>
        <p style={{ margin: 0, fontSize: 14, opacity: 0.8, lineHeight: 1.4 }}>
          Provide liquidity to earn trading fees
        </p>
      </div>

      {/* Token A Input */}
      <div style={{ display: 'grid', gap: 8 }}>
        <label style={{ fontSize: 14, opacity: 0.85 }}>Token A</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <TokenSelector
            selected={state.tokenA ? { contractId: state.tokenA, symbol: state.symbolA } : null}
            onSelect={handleTokenChange('tokenA')}
            exclude={state.tokenB ? [{ contractId: state.tokenB }] : []}
            disabled={state.loading}
            tokens={[]} // This would be populated with available tokens
          />
          <div style={{ 
            flex: 1, 
            padding: '12px 16px', 
            borderRadius: 8, 
            background: '#1a1a23', 
            color: 'white', 
            border: '1px solid #3a3a4a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.0"
              value={state.amountA}
              onChange={handleAmountChange('amountA')}
              disabled={state.loading}
              style={{ 
                flex: 1, 
                background: 'transparent', 
                border: 'none', 
                color: 'white',
                outline: 'none',
                fontSize: '16px'
              }}
            />
            {state.symbolA && (
              <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', fontWeight: 500 }}>
                {state.symbolA}
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', opacity: 0.8, fontSize: 20 }}>+</div>

      {/* Token B Input */}
      <div style={{ display: 'grid', gap: 8 }}>
        <label style={{ fontSize: 14, opacity: 0.85 }}>Token B</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <TokenSelector
            selected={state.tokenB ? { contractId: state.tokenB, symbol: state.symbolB } : null}
            onSelect={handleTokenChange('tokenB')}
            exclude={state.tokenA ? [{ contractId: state.tokenA }] : []}
            disabled={state.loading}
            tokens={[]} // This would be populated with available tokens
          />
          <div style={{ 
            flex: 1, 
            padding: '12px 16px', 
            borderRadius: 8, 
            background: '#1a1a23', 
            color: 'white', 
            border: '1px solid #3a3a4a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <input
              type="text"
              inputMode="decimal"
              placeholder="0.0"
              value={state.amountB}
              onChange={handleAmountChange('amountB')}
              disabled={state.loading}
              style={{ 
                flex: 1, 
                background: 'transparent', 
                border: 'none', 
                color: 'white',
                outline: 'none',
                fontSize: '16px'
              }}
            />
            {state.symbolB && (
              <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', fontWeight: 500 }}>
                {state.symbolB}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Pool Preview */}
      {state.pairPreview && (
        <div style={{ 
          padding: 12, 
          borderRadius: 8, 
          background: '#1a1a23', 
          border: '1px solid #3a3a4a' 
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Pool Preview</div>
          <div style={{ display: 'grid', gap: 4, fontSize: 12, opacity: 0.8 }}>
            <div>Rate: 1 {state.symbolA} = {state.pairPreview.ratioAinB} {state.symbolB}</div>
            <div>Rate: 1 {state.symbolB} = {state.pairPreview.ratioBinA} {state.symbolA}</div>
            {state.pairPreview.sharePct && (
              <div>Pool Share: {state.pairPreview.sharePct}%</div>
            )}
            {state.pairPreview.lpMintEstimate && (
              <div>LP Tokens: {state.pairPreview.lpMintEstimate}</div>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {state.error && (
        <div style={{ color: '#ff6b6b', fontSize: 14, textAlign: 'center' }}>
          {state.error}
        </div>
      )}

      {/* Submit Button */}
      {address ? (
        <button
          onClick={handleSubmit}
          disabled={state.loading || !state.amountA || !state.amountB || !state.tokenA || !state.tokenB}
          style={{ 
            padding: '14px 20px', 
            borderRadius: 10, 
            border: '1px solid #3a3a4a', 
            background: '#2a2a39', 
            color: 'white',
            cursor: state.loading ? 'not-allowed' : 'pointer',
            fontSize: 16,
            fontWeight: 600
          }}
        >
          {state.loading ? 'Adding Liquidity...' : 'Add Liquidity'}
        </button>
      ) : (
        <ConnectWalletButton 
          label="Connect Wallet to Add Liquidity"
          block
          style={{ 
            padding: '14px 20px', 
            borderRadius: 10, 
            border: '1px solid #3a3a4a', 
            background: '#2a2a39', 
            color: 'white',
            fontSize: 16,
            fontWeight: 600
          }}
        />
      )}
    </div>
  );
}
