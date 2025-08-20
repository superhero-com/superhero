import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store/store';
import { useTokenList } from '../hooks/useTokenList';
import { useTokenBalances } from '../hooks/useTokenBalances';

export default function NewAccountEducation() {
  const address = useSelector((s: RootState) => s.root.address);
  const balance = useSelector((s: RootState) => s.root.balance);
  const isNewAccount = useSelector((s: RootState) => s.root.isNewAccount);
  const { tokens } = useTokenList();
  const { balances } = useTokenBalances(null, null);

  // Check if this is a new account (marked as new in Redux or no balance/tokens)
  const shouldShow = address && (isNewAccount || (
    (typeof balance === 'number' ? balance === 0 : Number(balance) === 0) && 
    (!balances.in || Number(balances.in) === 0) && 
    (!balances.out || Number(balances.out) === 0)
  ));

  if (!shouldShow) {
    return null;
  }

  return (
    <div style={{ 
      marginBottom: 20, 
      borderRadius: 20, 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)', 
      padding: 3,
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 20px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)'
    }}>
      {/* Animated background elements */}
      <div style={{
        position: 'absolute',
        top: -50,
        right: -50,
        width: 100,
        height: 100,
        background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)',
        borderRadius: '50%',
        animation: 'pulse 3s ease-in-out infinite'
      }} />
      <div style={{
        position: 'absolute',
        bottom: -30,
        left: -30,
        width: 80,
        height: 80,
        background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)',
        borderRadius: '50%',
        animation: 'pulse 4s ease-in-out infinite reverse'
      }} />
      
      <div style={{ 
        background: 'linear-gradient(145deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
        borderRadius: 17,
        padding: 24,
        position: 'relative',
        zIndex: 1,
        border: '1px solid rgba(255,255,255,0.1)'
      }}>
        {/* Header with emoji and gradient text */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 50%, #ff9ff3 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            boxShadow: '0 8px 20px rgba(255,107,107,0.3)',
            border: '2px solid rgba(255,255,255,0.2)'
          }}>
            🚀
          </div>
          <div>
            <h3 style={{ 
              margin: 0, 
              fontSize: 24, 
              fontWeight: 800, 
              background: 'linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 50%, #45b7d1 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: 6,
              letterSpacing: '-0.5px'
            }}>
              Welcome to æternity! ✨
            </h3>
            <p style={{ 
              margin: 0, 
              fontSize: 16, 
              color: '#b8c5d6',
              lineHeight: 1.4,
              fontWeight: 500
            }}>
              Your account is fresh and ready to explore! Let's get you some AE to start trading 🎯
            </p>
          </div>
        </div>

        {/* Main content with glassmorphism */}
        <div style={{ 
          background: 'rgba(255,255,255,0.05)', 
          borderRadius: 16, 
          padding: 20, 
          marginBottom: 20,
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
        }}>
          <h4 style={{ 
            margin: '0 0 16px 0', 
            fontSize: 20, 
            fontWeight: 700, 
            color: '#4ecdc4',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            🎯 How to get AE (3 easy steps):
          </h4>
          
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ 
              display: 'flex', 
              gap: 16, 
              alignItems: 'flex-start',
              padding: 16,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.05)',
              transition: 'all 0.3s ease'
            }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 'bold',
                color: 'white',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(255,107,107,0.3)'
              }}>
                1
              </div>
              <div>
                <div style={{ 
                  fontWeight: 700, 
                  color: 'white', 
                  marginBottom: 6,
                  fontSize: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  🌉 Bridge ETH from Ethereum
                </div>
                <div style={{ 
                  fontSize: 14, 
                  color: '#b8c5d6', 
                  lineHeight: 1.5,
                  fontWeight: 400
                }}>
                  Send ETH from your Ethereum wallet to æternity. The bridge converts your ETH to æETH, 
                  which you can then swap for native AE tokens! 🔄
                </div>
              </div>
            </div>

            <div style={{ 
              display: 'flex', 
              gap: 16, 
              alignItems: 'flex-start',
              padding: 16,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.05)',
              transition: 'all 0.3s ease'
            }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 'bold',
                color: 'white',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(78,205,196,0.3)'
              }}>
                2
              </div>
              <div>
                <div style={{ 
                  fontWeight: 700, 
                  color: 'white', 
                  marginBottom: 6,
                  fontSize: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  🎛️ Use the Bridge Widget Below
                </div>
                <div style={{ 
                  fontSize: 14, 
                  color: '#b8c5d6', 
                  lineHeight: 1.5,
                  fontWeight: 400
                }}>
                  Scroll down to find the "Bridge ETH → AE" widget. Enter your ETH amount and follow the 
                  simple steps - it's super easy! ⚡
                </div>
              </div>
            </div>

            <div style={{ 
              display: 'flex', 
              gap: 16, 
              alignItems: 'flex-start',
              padding: 16,
              borderRadius: 12,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.05)',
              transition: 'all 0.3s ease'
            }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #45b7d1 0%, #96c93d 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 'bold',
                color: 'white',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(69,183,209,0.3)'
              }}>
                3
              </div>
              <div>
                <div style={{ 
                  fontWeight: 700, 
                  color: 'white', 
                  marginBottom: 6,
                  fontSize: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  🚀 Start Trading & Exploring
                </div>
                <div style={{ 
                  fontSize: 14, 
                  color: '#b8c5d6', 
                  lineHeight: 1.5,
                  fontWeight: 400
                }}>
                  Once you have AE, you can start swapping tokens, providing liquidity, and exploring the 
                  amazing æternity ecosystem! 🎉
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pro tip section */}
        <div style={{ 
          background: 'linear-gradient(135deg, rgba(255,193,7,0.15) 0%, rgba(255,107,107,0.1) 100%)', 
          borderRadius: 16, 
          padding: 16,
          border: '1px solid rgba(255,193,7,0.2)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ 
              fontSize: 20,
              filter: 'drop-shadow(0 2px 4px rgba(255,193,7,0.3))'
            }}>💡</span>
            <div style={{ fontSize: 14, color: '#f0f0f0', lineHeight: 1.5 }}>
              <strong style={{ color: '#ffc107' }}>Pro Tip:</strong> The bridge takes a few minutes to complete. 
              Make sure you have some ETH in your Ethereum wallet first! If you see a "404 Not Found" error, 
              that's totally normal for new accounts - don't worry! 😊
            </div>
          </div>
        </div>

        {/* Call to action */}
        <div style={{ 
          marginTop: 16,
          textAlign: 'center',
          padding: 12,
          background: 'rgba(255,255,255,0.05)',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ 
            fontSize: 14, 
            color: '#4ecdc4', 
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6
          }}>
            🎯 Ready to get started? Scroll down to the bridge widget below! ⬇️
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
