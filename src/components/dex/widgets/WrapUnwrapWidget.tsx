import React, { useState } from 'react';
import { useTokenBalances } from '../hooks/useTokenBalances';
import { toAettos, DEX_ADDRESSES } from '../../../libs/dex';
import { errorToUserMessage } from '../../../libs/errorMessages';
import { useAccount, useAeSdk, useWallet } from '../../../hooks';
import { Decimal } from '../../../libs/decimal';
import waeACI from 'dex-contracts-v2/build/WAE.aci.json';


export default function WrapUnwrapWidget() {
  const { sdk } = useAeSdk();
  const { activeAccount } = useAccount();
  const { wrapBalances, refreshWrapBalances } = useTokenBalances(null, null);
  const [wrapAmount, setWrapAmount] = useState<string>('');
  const [wrapping, setWrapping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function wrapAeToWae(amountAe: string) {
    try {
      setWrapping(true);
      setError(null);
      const wae = await sdk.initializeContract({
        aci: waeACI,
        address: DEX_ADDRESSES.wae
      });
      const aettos = Decimal.from(amountAe).bigNumber;
      // const aettos = toAettos(amountAe || '0', 18).toString();
      await wae.deposit({ amount: aettos });
      setWrapAmount('');
      void refreshWrapBalances();
    } catch (e: any) {
      setError(errorToUserMessage(e, { action: 'wrap' }));
    } finally {
      setWrapping(false);
    }
  }

  async function unwrapWaeToAe(amountWae: string) {
    try {
      setWrapping(true);
      setError(null);
      const wae = await sdk.initializeContract({ aci: waeACI, address: DEX_ADDRESSES.wae });
      const aettos = Decimal.from(amountWae).bigNumber;
      await wae.withdraw(aettos, null);
      setWrapAmount('');
      void refreshWrapBalances();
    } catch (e: any) {
      setError(errorToUserMessage(e, { action: 'unwrap' }));
    } finally {
      setWrapping(false);
    }
  }

  return (
    <div style={{ marginTop: 16, border: '1px solid #3a3a4a', borderRadius: 12, background: '#14141c', padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontWeight: 700 }}>Wrap / Unwrap AE ↔ WAE</div>
        <div style={{ fontSize: 12, opacity: 0.8 }}>
          AE: {wrapBalances.ae ?? '…'} | WAE: {wrapBalances.wae ?? '…'}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input
          aria-label="wrap-amount"
          placeholder="0.0"
          type="number"
          min="0"
          step="any"
          value={wrapAmount}
          onChange={(e) => setWrapAmount(e.target.value)}
          style={{
            flex: 1,
            padding: '8px 10px',
            borderRadius: 8,
            background: '#1a1a23',
            color: 'white',
            border: '1px solid #3a3a4a'
          }}
        />
        <button
          onClick={() => void wrapAeToWae(wrapAmount || '0')}
          disabled={wrapping || !wrapAmount || Number(wrapAmount) <= 0}
          style={{
            padding: '8px 10px',
            borderRadius: 8,
            border: '1px solid #3a3a4a',
            background: '#2a2a39',
            color: 'white',
            cursor: wrapping ? 'not-allowed' : 'pointer'
          }}
        >
          {wrapping ? 'Wrapping…' : 'Wrap AE→WAE'}
        </button>
        <button
          onClick={() => void unwrapWaeToAe(wrapAmount || '0')}
          disabled={wrapping || !wrapAmount || Number(wrapAmount) <= 0}
          style={{
            padding: '8px 10px',
            borderRadius: 8,
            border: '1px solid #3a3a4a',
            background: '#2a2a39',
            color: 'white',
            cursor: wrapping ? 'not-allowed' : 'pointer'
          }}
        >
          {wrapping ? 'Unwrapping…' : 'Unwrap WAE→AE'}
        </button>
      </div>

      {error && <div style={{ color: '#ff6b6b', fontSize: 13, marginTop: 8 }}>{error}</div>}
    </div>
  );
}
