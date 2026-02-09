import React, { useState } from 'react';
import { useWallet } from '../hooks';

export default function GlobalNewAccountEducation() {
  const {
    address, balance, isNewAccount, setIsNewAccount,
  } = useWallet();
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if this is a new account (no AE balance and marked as new)
  const shouldShow = address && isNewAccount && !isDismissed;

  if (!shouldShow) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsNewAccount(false);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 20,
      right: 20,
      zIndex: 1000,
      maxWidth: 400,
      borderRadius: 20,
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)',
      padding: 3,
      boxShadow: '0 20px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)',
      animation: 'slideIn 0.5s ease-out',
    }}
    >
      {/* Animated background elements */}
      <div style={{
        position: 'absolute',
        top: -20,
        right: -20,
        width: 60,
        height: 60,
        background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)',
        borderRadius: '50%',
        animation: 'pulse 3s ease-in-out infinite',
      }}
      />

      <div style={{
        background: 'linear-gradient(145deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)',
        borderRadius: 17,
        padding: 20,
        position: 'relative',
        zIndex: 1,
        border: '1px solid rgba(255,255,255,0.1)',
      }}
      >
        {/* Header with close button */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16,
        }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 50%, #ff9ff3 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              boxShadow: '0 8px 20px rgba(255,107,107,0.3)',
              border: '2px solid rgba(255,255,255,0.2)',
            }}
            >
              🚀
            </div>
            <div>
              <h4 style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 700,
                background: 'linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 50%, #45b7d1 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.5px',
              }}
              >
                New to æternity? ✨
              </h4>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '50%',
              width: 24,
              height: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#b8c5d6',
              fontSize: 14,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.color = '#b8c5d6';
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ marginBottom: 16 }}>
          <p style={{
            margin: '0 0 12px 0',
            fontSize: 14,
            color: '#b8c5d6',
            lineHeight: 1.4,
            fontWeight: 400,
          }}
          >
            Your account is fresh and ready to explore! 🌟
          </p>

          <div style={{
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 12,
            padding: 12,
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
          }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
            }}
            >
              <span style={{ fontSize: 16 }}>💡</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#4ecdc4' }}>Quick Start Guide:</span>
            </div>
            <div style={{ fontSize: 12, color: '#b8c5d6', lineHeight: 1.4 }}>
              1.
              {' '}
              <strong>Swap ETH</strong>
              {' '}
              from Ethereum to get AE tokens
              <br />
              2.
              {' '}
              <strong>Visit the DEX</strong>
              {' '}
              to start trading
              <br />
              3.
              {' '}
              <strong>Explore</strong>
              {' '}
              the æternity ecosystem! 🎉
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => window.location.href = '/defi'}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: 8,
              border: 'none',
              background: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
              color: 'white',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(78,205,196,0.3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(78,205,196,0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(78,205,196,0.3)';
            }}
          >
            🎯 Go to DEX
          </button>
          <button
            onClick={handleDismiss}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.05)',
              color: '#b8c5d6',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              e.currentTarget.style.color = '#b8c5d6';
            }}
          >
            Later
          </button>
        </div>
      </div>

      <style>
        {`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.1); opacity: 1; }
        }
      `}
      </style>
    </div>
  );
}
