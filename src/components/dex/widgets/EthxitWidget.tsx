import React, { useState, useEffect } from 'react';
import ConnectWalletButton from '../../ConnectWalletButton';
import { 
  initDexContracts, 
  toAettos, 
  fromAettos, 
  subSlippage,
  ensureAllowanceForRouter,
  DEX_ADDRESSES
} from '../../../libs/dex';
import { errorToUserMessage } from '../../../libs/errorMessages';
import { useToast } from '../../ToastProvider';
import { CONFIG } from '../../../config';

import { useWallet, useDex } from '../../../hooks';
export default function EthxitWidget() {
  const address = useWallet().address;
  const slippagePct = useDex().slippagePct;
  const deadlineMins = useDex().deadlineMins;
  const toast = useToast();

  const [ethxitIn, setEthxitIn] = useState('');
  const [ethxitOut, setEthxitOut] = useState('');
  const [ethxitQuoting, setEthxitQuoting] = useState(false);
  const [ethxitSwapping, setEthxitSwapping] = useState(false);
  const [ethxitError, setEthxitError] = useState<string | null>(null);

  // Automated ETHXIT quoting
  useEffect(() => {
    if (!ethxitIn || Number(ethxitIn) <= 0) {
      setEthxitOut('');
      return;
    }
    
    const timer = setTimeout(async () => {
      try {
        setEthxitQuoting(true);
        setEthxitError(null);
        const sdk = (window as any).__aeSdk;
        if (!sdk) return;
        const { router } = await initDexContracts(sdk);
        const ain = toAettos(ethxitIn || '0', 18);
        const path = [DEX_ADDRESSES.aeeth, DEX_ADDRESSES.wae];
        const { decodedResult } = await (router as any).get_amounts_out(ain, path);
        const out = decodedResult[decodedResult.length - 1];
        setEthxitOut(fromAettos(out, 18));
      } catch (e: any) {
        setEthxitError(errorToUserMessage(e, { action: 'quote' }));
      } finally {
        setEthxitQuoting(false);
      }
    }, 300); // 300ms delay to avoid too many requests

    return () => clearTimeout(timer);
  }, [ethxitIn]);

  const handleEthxitSwap = async () => {
    try {
      setEthxitSwapping(true); 
      setEthxitError(null);
      const sdk = (window as any).__aeSdk;
      const { router } = await initDexContracts(sdk);
      const toAccount = (address as string);
      const path = [DEX_ADDRESSES.aeeth, DEX_ADDRESSES.wae];
      const ain = toAettos(ethxitIn || '0', 18);
      
      // ensure allowance for aeETH
      await ensureAllowanceForRouter(sdk, DEX_ADDRESSES.aeeth, toAccount, ain);
      const { decodedResult } = await (router as any).get_amounts_out(ain, path);
      const out = BigInt(decodedResult[decodedResult.length - 1]);
      const minOut = subSlippage(out, slippagePct);
      const deadline = BigInt(Date.now() + Math.max(1, Math.min(60, deadlineMins)) * 60_000);
      
      const res = await (router as any).swap_exact_tokens_for_ae(
        ain,
        minOut,
        path,
        toAccount,
        deadline,
        null,
      );
      
      setEthxitIn(''); 
      setEthxitOut('');
      const txHash = (res?.hash || res?.tx?.hash || res?.transactionHash || '').toString();
      
      try {
        const url = CONFIG.EXPLORER_URL ? `${CONFIG.EXPLORER_URL.replace(/\/$/, '')}/transactions/${txHash || ''}` : '';
        toast.push(
          React.createElement('div', {},
            React.createElement('div', {}, 'ETHXIT swap submitted'),
            txHash && CONFIG.EXPLORER_URL && React.createElement('a', {
              href: url,
              target: '_blank',
              rel: 'noreferrer',
              style: { color: '#8bc9ff', textDecoration: 'underline' }
            }, 'View on explorer')
          )
        );
      } catch {}
    } catch (e: any) {
      setEthxitError(errorToUserMessage(e, { action: 'swap', slippagePct, deadlineMins }));
    } finally { 
      setEthxitSwapping(false); 
    }
  };

  return (
    <div style={{ marginTop: 16, border: '1px solid #3a3a4a', borderRadius: 12, background: '#14141c', padding: 16 }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: 20, fontWeight: 600, color: 'white' }}>Convert aeETH to AE</h3>
        <p style={{ margin: 0, fontSize: 14, opacity: 0.8, lineHeight: 1.4 }}>
          First bridge ETH → aeETH, then swap aeETH → AE
        </p>
      </div>

      {!address && (
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <ConnectWalletButton 
            label="Connect Wallet"
            block
            style={{ 
              padding: '12px 24px', 
              borderRadius: 12, 
              border: 'none', 
              background: '#4caf50', 
              color: 'white', 
              fontSize: 16, 
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.2s ease'
            }}
          />
        </div>
      )}

      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <label style={{ fontSize: 12, opacity: 0.85 }}>From (aeETH)</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ 
              flex: 1, 
              padding: '8px 10px', 
              borderRadius: 8, 
              background: '#1a1a23', 
              color: 'white', 
              border: '1px solid #3a3a4a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <input
                aria-label="ethxit-amount-in"
                placeholder="0.0"
                value={ethxitIn}
                onChange={(e) => setEthxitIn(e.target.value)}
                style={{ 
                  flex: 1, 
                  background: 'transparent', 
                  border: 'none', 
                  color: 'white',
                  outline: 'none',
                  fontSize: '14px'
                }}
              />
              <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', fontWeight: 500 }}>aeETH</span>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', opacity: 0.8 }}>↓</div>

        <div style={{ display: 'grid', gap: 6 }}>
          <label style={{ fontSize: 12, opacity: 0.85 }}>To (AE)</label>
          <div style={{ 
            padding: '8px 10px', 
            borderRadius: 8, 
            background: '#1a1a23', 
            color: 'white', 
            border: '1px solid #3a3a4a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ color: 'white', fontSize: '14px' }}>
              {ethxitQuoting ? 'Quoting…' : (ethxitOut || '0.0')}
            </span>
            <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', fontWeight: 500 }}>AE</span>
          </div>
        </div>

        {ethxitError && <div style={{ color: '#ff6b6b', fontSize: 13 }}>{ethxitError}</div>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleEthxitSwap}
            disabled={ethxitSwapping || !address || !ethxitIn || Number(ethxitIn) <= 0}
            style={{ 
              padding: '8px 10px', 
              borderRadius: 8, 
              border: '1px solid #3a3a4a', 
              background: address ? '#4caf50' : '#2a2a39', 
              color: 'white', 
              flex: 1,
              fontWeight: address ? 600 : 400,
              transition: 'background-color 0.2s ease',
              cursor: ethxitSwapping ? 'not-allowed' : 'pointer'
            }}
            onMouseOver={(e) => {
              if (address && !ethxitSwapping) e.currentTarget.style.background = '#45a049';
            }}
            onMouseOut={(e) => {
              if (address) e.currentTarget.style.background = '#4caf50';
            }}
          >
            {ethxitSwapping ? 'Swapping…' : (address ? 'Swap' : 'Connect Wallet')}
          </button>
        </div>

        {/* Slippage setting */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, opacity: 0.85 }}>
          <span>Slippage:</span>
          <input
            type="number"
            min="0.1"
            max="50"
            step="0.1"
            value={slippagePct}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              if (!isNaN(value) && value >= 0.1 && value <= 50) {
                setSlippage(value);
              }
            }}
            style={{ 
              width: 60, 
              padding: '4px 8px', 
              borderRadius: 6, 
              background: '#1a1a23', 
              color: 'white', 
              border: '1px solid #3a3a4a',
              fontSize: 12
            }}
          />
          <span>%</span>
        </div>
      </div>

      {/* Hint section */}
      <div style={{ marginTop: 16, padding: 12, background: 'rgba(255, 255, 255, 0.02)', borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 16 }}>💡</span>
          <span style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.8)' }}>Need to bridge ETH first?</span>
        </div>
        <a 
          href="https://aepp.dex.superhero.com" 
          target="_blank" 
          rel="noreferrer"
          style={{ 
            color: '#4caf50', 
            textDecoration: 'none', 
            fontSize: 14,
            fontWeight: 500
          }}
          onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
          onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
        >
          Visit Superhero Swap
        </a>
      </div>
    </div>
  );
}
