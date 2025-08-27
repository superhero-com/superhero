import React from 'react';
import { LiquidityPosition } from '../types/pool';
import { CONFIG } from '../../../config';
import { Decimal } from '../../../libs/decimal';
import { toAe } from '@aeternity/aepp-sdk';
import AddressChip from '../../../components/AddressChip';

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
      padding: 0
    }}>
      <div style={{ flex: 1 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 8,
          flexWrap: 'wrap'
        }}>
          <div style={{
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--standard-font-color)',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
            <AddressChip
              address={position.token0}
              linkToExplorer
              style={{ fontSize: 10 }}
            />
            <span style={{ fontSize: 18, color: 'var(--light-font-color)' }}>
              /
            </span>
            <AddressChip
              address={position.token1}
              linkToExplorer
              style={{ fontSize: 10 }}
            />
          </div>
          {position.valueUsd && (
            <div style={{
              fontSize: 12,
              color: 'var(--success-color)',
              fontWeight: 600,
              padding: '4px 8px',
              borderRadius: 8,
              background: 'rgba(76, 175, 80, 0.1)',
              border: '1px solid rgba(76, 175, 80, 0.2)'
            }}>
              ${Decimal.from(position.valueUsd ?? '0').prettify()}
            </div>
          )}
          <span style={{ fontSize: 10, color: 'var(--light-font-color)' }}>
            View Pair
          </span>
          <AddressChip
            address={position.pairId}
            copyable
            linkToExplorer
            hideAvatar
            style={{ fontSize: 10 }}
          />
        </div>

        <div style={{
          display: 'flex',
          gap: 20,
          fontSize: 12,
          color: 'var(--light-font-color)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.7 }}>
              LP Tokens
            </span>
            <span style={{ fontWeight: 600, color: 'var(--standard-font-color)' }}>
              {Decimal.from(toAe(position.balance ?? '0')).prettify()}
            </span>
          </div>
          {position.sharePct && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.7 }}>
                Pool Share
              </span>
              <span style={{ fontWeight: 600, color: 'var(--standard-font-color)' }}>
                {Decimal.from(position.sharePct ?? '0').prettify()}%
              </span>
            </div>
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
              padding: '8px 16px',
              borderRadius: 10,
              border: '1px solid var(--glass-border)',
              background: 'var(--glass-bg)',
              color: 'var(--standard-font-color)',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500,
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease'
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
            + Add
          </button>
        )}
        {onRemove && (
          <button
            onClick={() => onRemove(position.pairId)}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              border: '1px solid rgba(255, 107, 107, 0.3)',
              background: 'rgba(255, 107, 107, 0.1)',
              color: 'var(--error-color)',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500,
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255, 107, 107, 0.2)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255, 107, 107, 0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
