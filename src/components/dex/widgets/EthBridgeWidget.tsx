import React, { useState, useEffect } from 'react';
import { useSwapExecution } from '../hooks/useSwapExecution';
import { 
  initDexContracts, 
  toAettos, 
  fromAettos, 
  subSlippage,
  ensureAllowanceForRouter,
  getTokenBalance,
  DEX_ADDRESSES
} from '../../../libs/dex';
import { bridgeEthToAe } from '../../../libs/bridge';
import { errorToUserMessage } from '../../../libs/errorMessages';
import { useToast } from '../../ToastProvider';
import { CONFIG } from '../../../config';

import { useWallet, useDex } from '../../../hooks';
export default function EthBridgeWidget() {
  const address = useWallet().address;
  const slippagePct = useDex().slippagePct;
  const deadlineMins = useDex().deadlineMins;
  const { ensureWallet } = useSwapExecution();
  const toast = useToast();

  const [ethBridgeIn, setEthBridgeIn] = useState('');
  const [ethBridgeOutAe, setEthBridgeOutAe] = useState('');
  const [ethBridgeQuoting, setEthBridgeQuoting] = useState(false);
  const [ethBridgeProcessing, setEthBridgeProcessing] = useState(false);
  const [ethBridgeError, setEthBridgeError] = useState<string | null>(null);
  const [ethBridgeStep, setEthBridgeStep] = useState<'idle'|'bridging'|'waiting'|'swapping'|'done'>('idle');

  // Automated ETH Bridge quoting
  useEffect(() => {
    if (!ethBridgeIn || Number(ethBridgeIn) <= 0) {
      setEthBridgeOutAe('');
      return;
    }
    
    const timer = setTimeout(async () => {
      try {
        setEthBridgeQuoting(true);
        setEthBridgeError(null);
        const sdk = (window as any).__aeSdk;
        if (!sdk) return;
        const { router } = await initDexContracts(sdk);
        const ain = toAettos(ethBridgeIn || '0', 18);
        const path = [DEX_ADDRESSES.aeeth, DEX_ADDRESSES.wae];
        const { decodedResult } = await (router as any).get_amounts_out(ain, path);
        const out = decodedResult[decodedResult.length - 1];
        // Out is WAE; 1:1 unwrap to AE
        setEthBridgeOutAe(fromAettos(out, 18));
      } catch (e: any) {
        setEthBridgeError(errorToUserMessage(e, { action: 'quote' }));
      } finally {
        setEthBridgeQuoting(false);
      }
    }, 300); // 300ms delay to avoid too many requests

    return () => clearTimeout(timer);
  }, [ethBridgeIn]);

  async function waitForAeEthDeposit(prevAeEth: bigint, expectedIncrease: bigint, timeoutMs = 300_000, pollMs = 6000): Promise<boolean> {
    const sdk = (window as any).__aeSdk;
    const started = Date.now();
    // eslint-disable-next-line no-console
    console.info('[dex] Waiting for æETH deposit…', { expectedIncrease: expectedIncrease.toString() });
    while (Date.now() - started < timeoutMs) {
      try {
        const now = await getTokenBalance(sdk, DEX_ADDRESSES.aeeth, address as string);
        // eslint-disable-next-line no-console
        console.info('[dex] æETH balance check', { prevAeEth: prevAeEth.toString(), now: now.toString() });
        if (now >= prevAeEth + expectedIncrease) return true;
      } catch {}
      await new Promise((r) => setTimeout(r, pollMs));
    }
    return false;
  }

  const handleEthBridge = async () => {
    try {
      setEthBridgeProcessing(true); 
      setEthBridgeError(null); 
      setEthBridgeStep('bridging');
      await ensureWallet();
      const sdk = (window as any).__aeSdk;
      const toAccount = (address as string);
      
      // Record pre-bridge aeETH balance
      const prevAeEth = await getTokenBalance(sdk, DEX_ADDRESSES.aeeth, toAccount);
      const amountEth = ethBridgeIn || '0';
      
      // 1) Bridge ETH -> aeETH
      await bridgeEthToAe({ amountEth, aeAccount: toAccount });
      setEthBridgeStep('waiting');
      
      const ain = toAettos(amountEth, 18);
      const arrived = await waitForAeEthDeposit(prevAeEth, ain);
      if (!arrived) throw new Error('Timed out waiting for bridged æETH');
      
      // 2) Swap aeETH -> AE (via WAE path)
      setEthBridgeStep('swapping');
      const { router } = await initDexContracts(sdk);
      const path = [DEX_ADDRESSES.aeeth, DEX_ADDRESSES.wae];
      
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
      
      const txHash = (res?.hash || res?.tx?.hash || res?.transactionHash || '').toString();
      try {
        const url = CONFIG.EXPLORER_URL ? `${CONFIG.EXPLORER_URL.replace(/\/$/, '')}/transactions/${txHash || ''}` : '';
        toast.push(
          React.createElement('div', {},
            React.createElement('div', {}, 'ETH→AE flow completed'),
            txHash && CONFIG.EXPLORER_URL && React.createElement('a', {
              href: url,
              target: '_blank',
              rel: 'noreferrer',
              style: { color: '#8bc9ff', textDecoration: 'underline' }
            }, 'View swap on explorer')
          )
        );
      } catch {}
      
      setEthBridgeStep('done'); 
      setEthBridgeIn(''); 
      setEthBridgeOutAe('');
    } catch (e: any) {
      setEthBridgeError(errorToUserMessage(e, { action: 'swap', slippagePct, deadlineMins }));
      setEthBridgeStep('idle');
    } finally { 
      setEthBridgeProcessing(false); 
    }
  };

  return (
    <div style={{ marginTop: 16, border: '1px solid #3a3a4a', borderRadius: 12, background: '#14141c', padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontWeight: 700 }}>Bridge ETH → AE</div>
      </div>
      
      <p style={{ margin: '6px 0 10px', fontSize: 12, opacity: 0.8 }}>
        Sends native ETH on Ethereum to æternity as æETH, then swaps æETH → AE on-chain.
      </p>
      
      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <label style={{ fontSize: 12, opacity: 0.85 }}>From (ETH, Ethereum)</label>
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
            <input
              aria-label="eth-bridge-amount-in"
              placeholder="0.0"
              value={ethBridgeIn}
              onChange={(e) => setEthBridgeIn(e.target.value)}
              style={{ 
                flex: 1, 
                background: 'transparent', 
                border: 'none', 
                color: 'white',
                outline: 'none',
                fontSize: '14px'
              }}
            />
            <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', fontWeight: 500 }}>ETH</span>
          </div>
        </div>
        
        <div style={{ textAlign: 'center', opacity: 0.8 }}>↓</div>
        
        <div style={{ display: 'grid', gap: 6 }}>
          <label style={{ fontSize: 12, opacity: 0.85 }}>To (AE, aeternity)</label>
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
              {ethBridgeQuoting ? 'Quoting…' : (ethBridgeOutAe || '0.0')}
            </span>
            <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', fontWeight: 500 }}>AE</span>
          </div>
        </div>
        
        {ethBridgeError && <div style={{ color: '#ff6b6b', fontSize: 13 }}>{ethBridgeError}</div>}
        
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={handleEthBridge}
            disabled={ethBridgeProcessing || !address || !ethBridgeIn || Number(ethBridgeIn) <= 0}
            style={{ 
              padding: '8px 10px', 
              borderRadius: 8, 
              border: '1px solid #3a3a4a', 
              background: '#2a2a39', 
              color: 'white', 
              flex: 1,
              cursor: ethBridgeProcessing ? 'not-allowed' : 'pointer'
            }}
          >
            {ethBridgeProcessing ? (
              ethBridgeStep === 'bridging' ? 'Bridging…' : 
              ethBridgeStep === 'waiting' ? 'Waiting for æETH…' : 
              ethBridgeStep === 'swapping' ? 'Swapping…' : 'Processing…'
            ) : (
              address ? 'Bridge & Swap' : 'Connect wallets'
            )}
          </button>
        </div>
        
        <div style={{ fontSize: 12, opacity: 0.8 }}>
          Status: {
            ethBridgeStep === 'idle' ? 'Idle' : 
            ethBridgeStep === 'bridging' ? 'Bridging ETH → æETH on Ethereum' : 
            ethBridgeStep === 'waiting' ? 'Waiting for æETH deposit on æternity' : 
            ethBridgeStep === 'swapping' ? 'Swapping æETH → AE' : 'Done'
          }
        </div>
      </div>
    </div>
  );
}
