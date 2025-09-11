import React, { useState, useEffect } from 'react';
import { useTokenList } from '../hooks/useTokenList';
import { useTokenBalances } from '../hooks/useTokenBalances';

import { useAccount, useWallet } from '../../../hooks';
export default function NewAccountEducation() {
  const { activeAccount: address, balance } = useAccount();
  const { isNewAccount } = useWallet();
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
    <div className="mb-5 rounded-[20px] bg-gradient-to-r from-indigo-400 via-purple-500 via-pink-400 via-red-400 to-blue-400 p-[3px] relative overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.3),_0_0_0_1px_rgba(255,255,255,0.1)]">
      {/* Animated background elements */}
      <div className="absolute -top-12 -right-12 w-25 h-25 bg-radial-gradient from-white/20 to-transparent rounded-full animate-pulse" />
      <div className="absolute -bottom-8 -left-8 w-20 h-20 bg-radial-gradient from-white/15 to-transparent rounded-full animate-pulse" style={{ animationDirection: 'reverse', animationDuration: '4s' }} />
      
      <div className="bg-gradient-to-br from-[#0f0f23] via-[#1a1a2e] to-[#16213e] rounded-[17px] p-6 relative z-10 border border-white/10">
        {/* Header with emoji and gradient text */}
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#ff6b6b] via-[#ee5a24] to-[#ff9ff3] flex items-center justify-center text-3xl shadow-[0_8px_20px_rgba(255,107,107,0.3)] border-2 border-white/20">
            🚀
          </div>
          <div>
            <h3 className="m-0 text-2xl font-extrabold bg-gradient-to-r from-[#ff6b6b] via-[#4ecdc4] to-[#45b7d1] bg-clip-text text-transparent mb-1.5 tracking-tight">
              Welcome to æternity! ✨
            </h3>
            <p className="m-0 text-base text-[#b8c5d6] leading-normal font-medium">
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

    </div>
  );
}
