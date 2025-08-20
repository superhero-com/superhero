import React from 'react';
import { LiquidityPosition } from '../types/pool';
import { CONFIG } from '../../../config';

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
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      border: '1px solid #3a3a4a', 
      borderRadius: 12, 
      padding: 16, 
      background: '#14141c',
      marginBottom: 8
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 8, 
          marginBottom: 4 
        }}>
          <div style={{ 
            fontSize: 16, 
            fontWeight: 600, 
            color: 'white' 
          }}>
            {position.token0} / {position.token1}
          </div>
          {position.valueUsd && (
            <div style={{ 
              fontSize: 12, 
              opacity: 0.7, 
              color: '#8bc9ff' 
            }}>
              ${Number(position.valueUsd).toLocaleString()}
            </div>
          )}
        </div>
        
        <div style={{ 
          display: 'flex', 
          gap: 16, 
          fontSize: 14, 
          opacity: 0.8 
        }}>
          <div>LP: {Number(position.balance).toFixed(6)}</div>
          {position.sharePct && (
            <div>Share: {Number(position.sharePct).toFixed(4)}%</div>
          )}
        </div>
      </div>

      <div style={{ 
        display: 'flex', 
        gap: 8 
      }}>
        {onAdd && (
          <button
            onClick={() => onAdd(position.pairId)}
            style={{ 
              padding: '8px 12px', 
              borderRadius: 8, 
              border: '1px solid #3a3a4a', 
              background: '#2a2a39', 
              color: 'white',
              cursor: 'pointer',
              fontSize: 12
            }}
          >
            Add
          </button>
        )}
        {onRemove && (
          <button
            onClick={() => onRemove(position.pairId)}
            style={{ 
              padding: '8px 12px', 
              borderRadius: 8, 
              border: '1px solid #ff6b6b', 
              background: 'transparent', 
              color: '#ff6b6b',
              cursor: 'pointer',
              fontSize: 12
            }}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
