import React from 'react';
import AeButton from '../AeButton';

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isAdding: boolean;
  tokenASymbol: string;
  tokenBSymbol: string;
  amountA?: string; // human
  amountB?: string; // human
  lpAmount?: string; // human
  ratioAinB?: string;
  ratioBinA?: string;
  sharePct?: string;
  slippagePct?: number;
  deadlineMins?: number;
  minReceivedA?: string;
  minReceivedB?: string;
  rateHint?: string;
  priceImpactPct?: number | null;
};

export default function ConfirmLiquidityModal(props: Props) {
  if (!props.open) return null;
  return (
    <div role="dialog" aria-label="confirm-liquidity" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'grid', placeItems: 'center' }}>
      <div style={{ background: '#14141c', color: 'white', border: '1px solid #3a3a4a', borderRadius: 10, padding: 16, width: 420 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>{props.isAdding ? 'Confirm Supply' : 'Confirm Remove'}</div>
        <div style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.9, marginBottom: 12 }}>
          {props.isAdding ? (
            <>
              <div>
                Supply {props.amountA || '0'} {props.tokenASymbol} and {props.amountB || '0'} {props.tokenBSymbol}
              </div>
              {props.sharePct && <div>Your pool share: {props.sharePct}%</div>}
              {props.rateHint && <div style={{ opacity: 0.9 }}>{props.rateHint}</div>}
            </>
          ) : (
            <>
              {props.lpAmount && <div>Remove LP: {props.lpAmount}</div>}
              {(props.minReceivedA || props.minReceivedB) && (
                <div>
                  {props.minReceivedA && <div>Min received: {props.minReceivedA}</div>}
                  {props.minReceivedB && <div>Min received: {props.minReceivedB}</div>}
                </div>
              )}
            </>
          )}
          {(props.ratioAinB || props.ratioBinA) && (
            <div style={{ borderTop: '1px solid #333', paddingTop: 6 }}>
              {props.ratioAinB && (
                <div>1 {props.tokenASymbol} = {props.ratioAinB} {props.tokenBSymbol}</div>
              )}
              {props.ratioBinA && (
                <div>1 {props.tokenBSymbol} = {props.ratioBinA} {props.tokenASymbol}</div>
              )}
            </div>
          )}
          {typeof props.slippagePct === 'number' && (
            <div>Slippage: {props.slippagePct}%</div>
          )}
          {typeof props.deadlineMins === 'number' && (
            <div>Deadline: {props.deadlineMins} min</div>
          )}
          {typeof props.priceImpactPct === 'number' && (
            <div style={{ color: props.priceImpactPct > 10 ? '#ff6b6b' : props.priceImpactPct > 5 ? '#ffb86b' : 'inherit' }}>
              Price impact: {props.priceImpactPct.toFixed(2)}%
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <AeButton onClick={props.onClose} variant="ghost" size="medium">Cancel</AeButton>
          <AeButton onClick={props.onConfirm} variant="primary" size="medium" style={{ flex: 1 }}>Confirm</AeButton>
        </div>
      </div>
    </div>
  );
}


