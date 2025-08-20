import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DexTabs from '../components/dex/DexTabs';
import LiquidityPositionCard from '../components/pool/core/LiquidityPositionCard';
import AddLiquidityForm from '../components/pool/core/AddLiquidityForm';
import { useLiquidityPositions } from '../components/pool/hooks/useLiquidityPositions';
import { LiquidityPosition } from '../components/pool/types/pool';
import ConnectWalletButton from '../components/ConnectWalletButton';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';

export default function PoolRefactored() {
  const navigate = useNavigate();
  const address = useSelector((s: RootState) => s.root.address);
  const { positions, loading, error } = useLiquidityPositions();
  const [activeTab, setActiveTab] = useState<'positions' | 'add'>('positions');

  const handleRemoveLiquidity = (pairId: string) => {
    navigate(`/pool/remove/${pairId}`);
  };

  const handleAddLiquidity = (pairId: string) => {
    setActiveTab('add');
  };

  const handleImportPool = () => {
    navigate('/pool/import');
  };

  const handleCreatePool = () => {
    navigate('/pool/deploy');
  };

  const handleAddNewLiquidity = () => {
    navigate('/pool/add');
  };

  return (
    <div className="pool-container" style={{ maxWidth: 1200, margin: '0 auto', padding: '20px' }}>
      <DexTabs />
      
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ 
          fontSize: 32, 
          fontWeight: 700, 
          color: 'white', 
          margin: '0 0 8px 0' 
        }}>
          Liquidity Pools
        </h1>
        <p style={{ 
          fontSize: 16, 
          opacity: 0.8, 
          margin: 0, 
          lineHeight: 1.5 
        }}>
          Provide liquidity to earn trading fees and participate in the ecosystem
        </p>
      </div>

      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        gap: 2, 
        marginBottom: 24,
        borderBottom: '1px solid #3a3a4a'
      }}>
        <button
          onClick={() => setActiveTab('positions')}
          style={{ 
            padding: '12px 24px',
            background: activeTab === 'positions' ? '#2a2a39' : 'transparent',
            border: 'none',
            color: activeTab === 'positions' ? 'white' : '#9aa',
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: 600,
            borderBottom: activeTab === 'positions' ? '2px solid #4caf50' : 'none'
          }}
        >
          Your Positions
        </button>
        <button
          onClick={() => setActiveTab('add')}
          style={{ 
            padding: '12px 24px',
            background: activeTab === 'add' ? '#2a2a39' : 'transparent',
            border: 'none',
            color: activeTab === 'add' ? 'white' : '#9aa',
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: 600,
            borderBottom: activeTab === 'add' ? '2px solid #4caf50' : 'none'
          }}
        >
          Add Liquidity
        </button>
      </div>

      {/* Content */}
      {activeTab === 'positions' && (
        <div>
          {/* Stats Overview */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: 16, 
            marginBottom: 24 
          }}>
            <div style={{ 
              padding: 20, 
              borderRadius: 12, 
              background: '#1a1a23', 
              border: '1px solid #3a3a4a' 
            }}>
              <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 4 }}>Total Positions</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'white' }}>
                {positions.length}
              </div>
            </div>
            <div style={{ 
              padding: 20, 
              borderRadius: 12, 
              background: '#1a1a23', 
              border: '1px solid #3a3a4a' 
            }}>
              <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 4 }}>Total Value</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#4caf50' }}>
                ${positions.reduce((sum, pos) => sum + (Number(pos.valueUsd) || 0), 0).toLocaleString()}
              </div>
            </div>
            <div style={{ 
              padding: 20, 
              borderRadius: 12, 
              background: '#1a1a23', 
              border: '1px solid #3a3a4a' 
            }}>
              <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 4 }}>Fees Earned</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#8bc9ff' }}>
                $0.00
              </div>
            </div>
          </div>

          {/* Positions List */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: 16 
            }}>
              <h2 style={{ 
                fontSize: 20, 
                fontWeight: 600, 
                color: 'white', 
                margin: 0 
              }}>
                Your Liquidity Positions
              </h2>
              {address && (
                <button
                  onClick={handleAddNewLiquidity}
                  style={{ 
                    padding: '8px 16px', 
                    borderRadius: 8, 
                    border: '1px solid #4caf50', 
                    background: '#4caf50', 
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 600
                  }}
                >
                  + Add New
                </button>
              )}
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 40, opacity: 0.7 }}>
                Loading your positions...
              </div>
            ) : error ? (
              <div style={{ 
                textAlign: 'center', 
                padding: 20, 
                color: '#ff6b6b', 
                background: '#1a1a23', 
                borderRadius: 8,
                border: '1px solid #ff6b6b'
              }}>
                {error}
              </div>
            ) : positions.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: 40, 
                background: '#1a1a23', 
                borderRadius: 12,
                border: '1px solid #3a3a4a'
              }}>
                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
                  No liquidity positions found
                </div>
                <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 16 }}>
                  Start earning fees by providing liquidity to trading pairs
                </div>
                {address ? (
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                    <button
                      onClick={handleAddNewLiquidity}
                      style={{ 
                        padding: '12px 24px', 
                        borderRadius: 8, 
                        border: '1px solid #4caf50', 
                        background: '#4caf50', 
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 600
                      }}
                    >
                      Add Liquidity
                    </button>
                    <button
                      onClick={handleImportPool}
                      style={{ 
                        padding: '12px 24px', 
                        borderRadius: 8, 
                        border: '1px solid #3a3a4a', 
                        background: '#2a2a39', 
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 600
                      }}
                    >
                      Import Pool
                    </button>
                  </div>
                ) : (
                  <ConnectWalletButton 
                    label="Connect Wallet to Start"
                    style={{ 
                      padding: '12px 24px', 
                      borderRadius: 8, 
                      border: '1px solid #4caf50', 
                      background: '#4caf50', 
                      color: 'white',
                      fontSize: 14,
                      fontWeight: 600
                    }}
                  />
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {positions.map((position) => (
                  <LiquidityPositionCard
                    key={position.pairId}
                    position={position}
                    onRemove={handleRemoveLiquidity}
                    onAdd={handleAddLiquidity}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          {positions.length > 0 && (
            <div style={{ 
              padding: 20, 
              borderRadius: 12, 
              background: '#1a1a23', 
              border: '1px solid #3a3a4a' 
            }}>
              <h3 style={{ 
                fontSize: 16, 
                fontWeight: 600, 
                color: 'white', 
                margin: '0 0 12px 0' 
              }}>
                Quick Actions
              </h3>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button
                  onClick={handleAddNewLiquidity}
                  style={{ 
                    padding: '8px 16px', 
                    borderRadius: 6, 
                    border: '1px solid #3a3a4a', 
                    background: '#2a2a39', 
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: 12
                  }}
                >
                  Add New Position
                </button>
                <button
                  onClick={handleImportPool}
                  style={{ 
                    padding: '8px 16px', 
                    borderRadius: 6, 
                    border: '1px solid #3a3a4a', 
                    background: '#2a2a39', 
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: 12
                  }}
                >
                  Import Pool
                </button>
                <button
                  onClick={handleCreatePool}
                  style={{ 
                    padding: '8px 16px', 
                    borderRadius: 6, 
                    border: '1px solid #3a3a4a', 
                    background: '#2a2a39', 
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: 12
                  }}
                >
                  Create Pool
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'add' && (
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <AddLiquidityForm />
        </div>
      )}
    </div>
  );
}
