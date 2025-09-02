import { useEffect, useMemo, useState } from 'react';
import { DEX_ADDRESSES } from '../../../libs/dex';
import ConnectWalletButton from '../../../components/ConnectWalletButton';
import { useAddLiquidity } from '../hooks';
import { useTokenList } from '../../../components/dex/hooks/useTokenList';
import { useTokenBalances } from '../../../components/dex/hooks/useTokenBalances';
import { Token } from '../../../components/dex/types/dex';
import TokenInput from '../../../components/dex/core/TokenInput';
import LiquiditySettings from './LiquiditySettings';
import LiquidityConfirmation from './LiquidityConfirmation';
import LiquidityPreview from './LiquidityPreview';
import LiquiditySuccessNotification from '../../../components/dex/core/LiquiditySuccessNotification';

import { useAccount, useDex } from '../../../hooks';
import { usePool } from '../context/PoolProvider';

export default function AddLiquidityForm() {
  const { activeAccount: address } = useAccount();
  const { slippagePct, deadlineMins } = useDex();
  const { currentAction, selectedTokenA, selectedTokenB, clearSelection, onPositionUpdated } = usePool();

  // Token list and balances
  const { tokens, loading: tokensLoading } = useTokenList();
  const [tokenA, setTokenA] = useState<Token | null>(null);
  const [tokenB, setTokenB] = useState<Token | null>(null);
  const { balances } = useTokenBalances(tokenA, tokenB);

  // Amounts and liquidity state
  const [amountA, setAmountA] = useState<string>('');
  const [amountB, setAmountB] = useState<string>('');
  const [searchA, setSearchA] = useState('');
  const [searchB, setSearchB] = useState('');

  // Liquidity hook
  const { state, setState, executeAddLiquidity } = useAddLiquidity();

  // UI state
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successTxHash, setSuccessTxHash] = useState<string>('');
  const [successAmounts, setSuccessAmounts] = useState<{ amountA: string; amountB: string }>({ amountA: '', amountB: '' });

  // Helper function to find token by symbol or contract address
  const findToken = (identifier: string): Token | null => {
    if (!identifier || !tokens.length) return null;
    
    // First try to find by symbol (case insensitive)
    const bySymbol = tokens.find(t => 
      t.symbol.toLowerCase() === identifier.toLowerCase()
    );
    if (bySymbol) return bySymbol;
    
    // Then try to find by contract address
    const byAddress = tokens.find(t => 
      t.contractId === identifier || t.contractId === identifier.toLowerCase()
    );
    if (byAddress) return byAddress;
    
    // For AE, check if it's the native token
    if (identifier.toLowerCase() === 'ae') {
      const aeToken = tokens.find(t => t.isAe);
      if (aeToken) return aeToken;
    }
    
    return null;
  };

  // Initialize tokens based on context or defaults
  useEffect(() => {
    if (!tokens.length) return;

    // Set initial tokens from context if provided (force update when context changes)
    if (selectedTokenA) {
      const foundTokenA = findToken(selectedTokenA);
      if (foundTokenA && (!tokenA || tokenA.symbol !== foundTokenA.symbol)) {
        setTokenA(foundTokenA);
      }
    }
    
    if (selectedTokenB) {
      const foundTokenB = findToken(selectedTokenB);
      if (foundTokenB && (!tokenB || tokenB.symbol !== foundTokenB.symbol)) {
        setTokenB(foundTokenB);
      }
    }
    
    // Set default tokens if no context tokens provided and none selected
    if (!selectedTokenA && !tokenA && tokens.length) {
      setTokenA(tokens[2] || tokens[0]);
    }
    if (!selectedTokenB && !tokenB && tokens.length) {
      setTokenB(tokens[0] || tokens[1]);
    }
  }, [tokens, selectedTokenA, selectedTokenB]);



  // Update hook state when tokens change
  useEffect(() => {
    setState(prev => ({
      ...prev,
      tokenA: tokenA?.contractId || '',
      tokenB: tokenB?.contractId || '',
      symbolA: tokenA?.symbol || '',
      symbolB: tokenB?.symbol || '',
      decA: tokenA?.decimals || 18,
      decB: tokenB?.decimals || 18,
    }));
  }, [tokenA, tokenB, setState]);

  // Update hook state when amounts change
  useEffect(() => {
    setState(prev => ({
      ...prev,
      amountA,
      amountB
    }));
  }, [amountA, amountB, setState]);

  const filteredTokensA = useMemo(() => {
    const term = searchA.trim().toLowerCase();
    const matches = (t: Token) =>
      !term || t.symbol.toLowerCase().includes(term) || (t.contractId || '').toLowerCase().includes(term);
    const ae = tokens.find((t) => t.isAe);
    const wae = tokens.find((t) => t.contractId === DEX_ADDRESSES.wae);
    const rest = tokens.filter((t) => t !== ae && t !== wae).filter(matches);
    const out: Token[] = [];
    if (ae && matches(ae)) out.push(ae);
    if (wae && matches(wae)) out.push(wae);
    out.push(...rest);
    return out;
  }, [tokens, searchA]);

  const filteredTokensB = useMemo(() => {
    const term = searchB.trim().toLowerCase();
    const matches = (t: Token) =>
      !term || t.symbol.toLowerCase().includes(term) || (t.contractId || '').toLowerCase().includes(term);
    const ae = tokens.find((t) => t.isAe);
    const wae = tokens.find((t) => t.contractId === DEX_ADDRESSES.wae);
    const rest = tokens.filter((t) => t !== ae && t !== wae).filter(matches);
    const out: Token[] = [];
    if (ae && matches(ae)) out.push(ae);
    if (wae && matches(wae)) out.push(wae);
    out.push(...rest);
    return out;
  }, [tokens, searchB]);

  const handleAddLiquidity = async () => {
    if (!tokenA || !tokenB || !amountA || !amountB) return;

    try {
      const txHash = await executeAddLiquidity({
        tokenA: tokenA.contractId,
        tokenB: tokenB.contractId,
        amountA,
        amountB,
        slippagePct,
        deadlineMins,
        isAePair: tokenA.contractId === 'AE' || tokenB.contractId === 'AE' || tokenA.isAe || tokenB.isAe || false,
      }, { suppressToast: true }); // Suppress toast since we're using the custom success notification

      if (txHash) {
        // Capture amounts before clearing form
        setSuccessAmounts({ amountA, amountB });
        setSuccessTxHash(txHash);
        setShowSuccess(true);
        
        // Clear form
        setAmountA('');
        setAmountB('');
        setShowConfirm(false);
        
        // Clear selection if we were adding to existing position
        if (currentAction === 'add') {
          clearSelection();
        }
        
        // Refresh positions after successful transaction
        await onPositionUpdated();
      }
    } catch (error) {
      console.error('Add liquidity failed:', error);
    }
  };

  const isAddDisabled = state.loading || !amountA || Number(amountA) <= 0 || !amountB || Number(amountB) <= 0 || !tokenA || !tokenB || !!state.error;

  return (
    <div className="genz-card" style={{
      maxWidth: 480,
      margin: '0 auto',
      background: 'var(--glass-bg)',
      border: '1px solid var(--glass-border)',
      backdropFilter: 'blur(20px)',
      borderRadius: 24,
      padding: 24,
      boxShadow: 'var(--glass-shadow)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24
      }}>
        <div>
          <h2 style={{
            fontSize: 20,
            fontWeight: 700,
            color: 'var(--standard-font-color)',
            margin: 0,
            background: 'var(--primary-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Add Liquidity
          </h2>
          {currentAction === 'add' && selectedTokenA && selectedTokenB && (
            <p style={{
              fontSize: 12,
              color: 'var(--light-font-color)',
              margin: '4px 0 0 0'
            }}>
              Adding to {selectedTokenA}/{selectedTokenB} position
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {currentAction === 'add' && (
            <button
              onClick={clearSelection}
              style={{
                padding: '8px 12px',
                borderRadius: 12,
                border: '1px solid var(--glass-border)',
                background: 'var(--glass-bg)',
                color: 'var(--standard-font-color)',
                cursor: 'pointer',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease',
                fontSize: 12,
                fontWeight: 500
              }}
            >
              ✕ Cancel
            </button>
          )}

          <LiquiditySettings>
          <button
            aria-label="open-settings"
            style={{
              padding: '8px 12px',
              borderRadius: 12,
              border: '1px solid var(--glass-border)',
              background: 'var(--glass-bg)',
              color: 'var(--standard-font-color)',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease',
              fontSize: 12,
              fontWeight: 500
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'var(--accent-color)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'var(--glass-bg)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            ⚙️ Settings
          </button>
                  </LiquiditySettings>
        </div>
      </div>

      <div style={{
        fontSize: 14,
        color: 'var(--light-font-color)',
        textAlign: 'center',
        marginBottom: 24,
        opacity: 0.9
      }}>
        Provide liquidity to earn trading fees from swaps
      </div>

      {/* Token A Input */}
      <div style={{ marginBottom: 8 }}>
        <TokenInput
          label="Token A"
          token={tokenA}
          amount={amountA}
          balance={balances.in}
          onTokenChange={setTokenA}
          onAmountChange={setAmountA}
          tokens={filteredTokensA}
          excludeTokens={tokenB ? [tokenB] : []}
          disabled={state.loading}
          loading={tokensLoading}
          searchValue={searchA}
          onSearchChange={setSearchA}
        />
      </div>

      {/* Plus Icon */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        margin: '16px 0',
        position: 'relative'
      }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'var(--button-gradient)',
            border: '2px solid var(--glass-border)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(255, 107, 107, 0.3)',
            zIndex: 2,
            position: 'relative'
          }}
        >
          +
        </div>
      </div>

      {/* Token B Input */}
      <div style={{ marginBottom: 20 }}>
        <TokenInput
          label="Token B"
          token={tokenB}
          amount={amountB}
          balance={balances.out}
          onTokenChange={setTokenB}
          onAmountChange={setAmountB}
          tokens={filteredTokensB}
          excludeTokens={tokenA ? [tokenA] : []}
          disabled={state.loading}
          loading={tokensLoading}
          searchValue={searchB}
          onSearchChange={setSearchB}
        />
      </div>

      {/* Liquidity Preview */}
      {state.pairPreview && (
        <LiquidityPreview 
          preview={state.pairPreview}
          tokenA={tokenA}
          tokenB={tokenB}
          pairExists={state.pairExists}
          hasError={!!state.error}
          onSuggestedAmountA={setAmountA}
          onSuggestedAmountB={setAmountB}
        />
      )}

      {/* Error Display */}
      {state.error && (
        <div style={{
          color: 'var(--error-color)',
          fontSize: 14,
          padding: '12px 16px',
          background: 'rgba(255, 107, 107, 0.1)',
          border: '1px solid rgba(255, 107, 107, 0.2)',
          borderRadius: 12,
          marginBottom: 20,
          textAlign: 'center'
        }}>
          {state.error}
        </div>
      )}

      {/* Add Liquidity Button */}
      {address ? (
        <button
          onClick={() => setShowConfirm(true)}
          disabled={isAddDisabled}
          className="genz-btn"
          style={{
            width: '100%',
            padding: '16px 24px',
            borderRadius: 16,
            border: 'none',
            background: isAddDisabled ?
              'rgba(255, 255, 255, 0.1)' :
              'var(--button-gradient)',
            color: 'white',
            cursor: isAddDisabled ? 'not-allowed' : 'pointer',
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: isAddDisabled ?
              'none' :
              'var(--button-shadow)',
            opacity: isAddDisabled ? 0.6 : 1
          }}
        >
          {state.loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <div style={{
                width: 16,
                height: 16,
                border: '2px solid rgba(255,255,255,0.3)',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              Confirm in wallet…
            </div>
          ) : 'Add Liquidity'}
        </button>
      ) : (
        <ConnectWalletButton
          label="Connect Wallet to Add Liquidity"
          block
          style={{
            width: '100%',
            padding: '16px 24px',
            borderRadius: 16,
            border: 'none',
            background: 'var(--button-gradient)',
            color: 'white',
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            boxShadow: 'var(--button-shadow)',
            cursor: 'pointer'
          }}
        />
      )}

      {/* Confirmation Modal */}
      <LiquidityConfirmation
        show={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleAddLiquidity}
        tokenA={tokenA}
        tokenB={tokenB}
        amountA={amountA}
        amountB={amountB}
        slippagePct={slippagePct}
        deadlineMins={deadlineMins}
        pairPreview={state.pairPreview}
        loading={state.loading}
      />

      {/* Success Notification */}
      <LiquiditySuccessNotification
        show={showSuccess}
        onClose={() => setShowSuccess(false)}
        tokenA={tokenA}
        tokenB={tokenB}
        amountA={successAmounts.amountA}
        amountB={successAmounts.amountB}
        txHash={successTxHash}
      />

      {/* Add keyframes for spinner animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
