import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from '../../../hooks';
import ConnectWalletButton from '../../../components/ConnectWalletButton';
import { AddLiquidityForm, RemoveLiquidityForm, LiquidityPositionCard } from '../components';
import { useLiquidityPositions } from '../hooks';
import { PoolProvider, usePool } from '../context/PoolProvider';
import RecentActivity from '../../../components/dex/supporting/RecentActivity';

function PoolContent() {
  const navigate = useNavigate();
  const { activeAccount } = useAccount();
  const { positions, loading, error, refreshPositions, invalidateCache } = useLiquidityPositions();
  const { selectPositionForAdd, selectPositionForRemove, currentAction, setRefreshPositions } = usePool();

  // // Connect refresh function to context
  // React.useEffect(() => {
  //   setRefreshPositions(() => refreshPositions);
  // }, [refreshPositions, setRefreshPositions]);

  const handleRemoveLiquidity = (pairId: string) => {
    const position = positions.find(p => p.pairId === pairId);
    if (position) {
      selectPositionForRemove(position);
    }
  };

  const handleAddLiquidity = (pairId: string) => {
    const position = positions.find(p => p.pairId === pairId);
    if (position) {
      selectPositionForAdd(position);
    }
    
    // Focus on the forms section
    const formsSection = document.getElementById('liquidity-forms-section');
    if (formsSection) {
      formsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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
    <div className="pool-layout" style={{ 
      maxWidth: 1200, 
      margin: '0 auto', 
      padding: '20px',
      display: 'grid',
      gridTemplateColumns: '1fr 480px',
      gap: 32,
      alignItems: 'start',
      minHeight: '100vh'
    }}>
      {/* Left Column - Positions */}
      <div className="genz-card" style={{
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
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ 
            fontSize: 28, 
            fontWeight: 700, 
            color: 'var(--standard-font-color)', 
            margin: '0 0 8px 0',
            background: 'var(--primary-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Your Liquidity Positions
          </h1>
          <p style={{ 
            fontSize: 14, 
            color: 'var(--light-font-color)', 
            margin: 0, 
            lineHeight: 1.5 
          }}>
            Manage your liquidity positions and track earnings
          </p>
        </div>

        {/* Stats Overview */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
          gap: 16, 
          marginBottom: 24 
        }}>
          <div style={{ 
            padding: 16, 
            borderRadius: 16, 
            background: 'rgba(255, 255, 255, 0.05)', 
            border: '1px solid var(--glass-border)',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ 
              fontSize: 12, 
              color: 'var(--light-font-color)', 
              marginBottom: 4,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Positions
            </div>
            <div style={{ 
              fontSize: 20, 
              fontWeight: 700, 
              color: 'var(--standard-font-color)' 
            }}>
              {positions.length}
            </div>
          </div>
          <div style={{ 
            padding: 16, 
            borderRadius: 16, 
            background: 'rgba(255, 255, 255, 0.05)', 
            border: '1px solid var(--glass-border)',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ 
              fontSize: 12, 
              color: 'var(--light-font-color)', 
              marginBottom: 4,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Total Value
            </div>
            <div style={{ 
              fontSize: 20, 
              fontWeight: 700, 
              color: 'var(--success-color)' 
            }}>
              ${positions.reduce((sum, pos) => sum + (Number(pos.valueUsd) || 0), 0).toLocaleString()}
            </div>
          </div>
          <div style={{ 
            padding: 16, 
            borderRadius: 16, 
            background: 'rgba(255, 255, 255, 0.05)', 
            border: '1px solid var(--glass-border)',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ 
              fontSize: 12, 
              color: 'var(--light-font-color)', 
              marginBottom: 4,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Fees Earned
            </div>
            <div style={{ 
              fontSize: 20, 
              fontWeight: 700, 
              color: 'var(--accent-color)' 
            }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h3 style={{ 
                  fontSize: 16, 
                  fontWeight: 600, 
                  color: 'var(--standard-font-color)', 
                  margin: 0 
                }}>
                  Active Positions
                </h3>
                {loading && positions.length > 0 && (
                  <div style={{
                    width: 16,
                    height: 16,
                    border: '2px solid rgba(255,255,255,0.1)',
                    borderTop: '2px solid var(--accent-color)',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {activeAccount && (
                  <button
                    onClick={() => refreshPositions()}
                    disabled={loading}
                    style={{ 
                      padding: '8px 16px', 
                      borderRadius: 12, 
                      border: '1px solid var(--glass-border)', 
                      background: loading ? 'rgba(255,255,255,0.1)' : 'var(--glass-bg)', 
                      color: loading ? 'var(--light-font-color)' : 'var(--standard-font-color)',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                      transition: 'all 0.3s ease',
                      backdropFilter: 'blur(10px)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      opacity: loading ? 0.6 : 1
                    }}
                    onMouseOver={(e) => {
                      if (!loading) {
                        e.currentTarget.style.background = 'var(--accent-color)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }
                    }}
                    onMouseOut={(e) => {
                      if (!loading) {
                        e.currentTarget.style.background = 'var(--glass-bg)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    {loading ? (
                      <>
                        <div style={{
                          width: 12,
                          height: 12,
                          border: '2px solid rgba(255,255,255,0.3)',
                          borderTop: '2px solid currentColor',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }}></div>
                        Refreshing...
                      </>
                    ) : (
                      <>🔄 Refresh</>
                    )}
                  </button>
                )}
                {activeAccount && positions.length > 0 && (
                  <button
                    onClick={handleAddNewLiquidity}
                    style={{ 
                      padding: '8px 16px', 
                      borderRadius: 12, 
                      border: '1px solid var(--success-color)', 
                      background: 'var(--success-color)', 
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                      transition: 'all 0.3s ease',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.3)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    + Add New
                  </button>
                )}
              </div>
            </div>

          {loading && positions.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: 40, 
              color: 'var(--light-font-color)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16
            }}>
              <div style={{
                width: 32,
                height: 32,
                border: '3px solid rgba(255,255,255,0.1)',
                borderTop: '3px solid var(--accent-color)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              Loading your positions...
            </div>
          ) : error ? (
            <div style={{ 
              textAlign: 'center', 
              padding: 20, 
              color: 'var(--error-color)', 
              background: 'rgba(255, 107, 107, 0.1)', 
              borderRadius: 16,
              border: '1px solid rgba(255, 107, 107, 0.2)',
              backdropFilter: 'blur(10px)'
            }}>
              {error}
            </div>
          ) : positions.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: 40, 
              background: 'rgba(255, 255, 255, 0.03)', 
              borderRadius: 16,
              border: '1px solid var(--glass-border)',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ 
                fontSize: 48, 
                marginBottom: 16,
                opacity: 0.3
              }}>
                💧
              </div>
              <div style={{ 
                fontSize: 16, 
                fontWeight: 600, 
                marginBottom: 8,
                color: 'var(--standard-font-color)'
              }}>
                No liquidity positions found
              </div>
              <div style={{ 
                fontSize: 14, 
                color: 'var(--light-font-color)', 
                marginBottom: 20,
                lineHeight: 1.5
              }}>
                Start earning fees by providing liquidity to trading pairs
              </div>
              {activeAccount ? (
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={handleAddNewLiquidity}
                    style={{ 
                      padding: '12px 24px', 
                      borderRadius: 12, 
                      border: 'none', 
                      background: 'var(--button-gradient)', 
                      color: 'white',
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 600,
                      transition: 'all 0.3s ease',
                      boxShadow: 'var(--button-shadow)'
                    }}
                  >
                    Add Liquidity
                  </button>
                </div>
              ) : (
                <ConnectWalletButton 
                  label="Connect Wallet to Start"
                  style={{ 
                    padding: '12px 24px', 
                    borderRadius: 12, 
                    border: 'none', 
                    background: 'var(--button-gradient)', 
                    color: 'white',
                    fontSize: 14,
                    fontWeight: 600,
                    boxShadow: 'var(--button-shadow)'
                  }}
                />
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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

        {/* Add keyframes for spinner animation and responsive styles */}
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          @media (max-width: 768px) {
            .pool-layout {
              grid-template-columns: 1fr !important;
              gap: 24px !important;
              padding: 16px !important;
            }
          }
        `}</style>
      </div>

      {/* Right Column - Liquidity Forms */}
      <div id="liquidity-forms-section" style={{ position: 'sticky', top: 20, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {currentAction === 'remove' ? (
          <RemoveLiquidityForm />
        ) : (
          <AddLiquidityForm />
        )}
        
        <RecentActivity />
      </div>
    </div>
  );
}

export default function Pool() {
  return (
    <PoolProvider>
      <PoolContent />
    </PoolProvider>
  );
}
