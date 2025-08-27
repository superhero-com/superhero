import React, { useState } from 'react';
import SwapForm from './SwapForm';
import { WrapUnwrapWidget } from '../../../features/dex';
import { EthBridgeWidget } from '../../../features/bridge';

export type SwapTab = 'swap' | 'wrap' | 'bridge';

interface TabConfig {
  id: SwapTab;
  label: string;
  icon: string;
  description: string;
  component: React.ComponentType;
}

const tabs: TabConfig[] = [
  {
    id: 'swap',
    label: 'Swap Tokens',
    icon: '🔄',
    description: 'Trade any supported AEX-9 tokens',
    component: SwapForm
  },
  {
    id: 'wrap',
    label: 'Wrap/Unwrap',
    icon: '📦',
    description: 'Convert AE ↔ WAE',
    component: WrapUnwrapWidget
  },
  {
    id: 'bridge',
    label: 'ETH Bridge',
    icon: '🌉',
    description: 'Bridge ETH to æternity',
    component: EthBridgeWidget
  }
];

interface SwapTabSwitcherProps {
  defaultTab?: SwapTab;
  className?: string;
  style?: React.CSSProperties;
}

export default function SwapTabSwitcher({ 
  defaultTab = 'swap', 
  className, 
  style 
}: SwapTabSwitcherProps) {
  const [activeTab, setActiveTab] = useState<SwapTab>(defaultTab);
  
  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || SwapForm;

  return (
    <div 
      className={`swap-tab-switcher ${className || ''}`}
      style={{
        display: 'flex',
        gap: 24,
        maxWidth: 1200,
        margin: '0 auto',
        ...style
      }}
    >
      {/* Vertical Tab Navigation */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minWidth: 200,
        flexShrink: 0
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '16px 20px',
              borderRadius: 16,
              border: activeTab === tab.id 
                ? '2px solid var(--accent-color)' 
                : '1px solid var(--glass-border)',
              background: activeTab === tab.id
                ? 'var(--glass-bg)'
                : 'rgba(255, 255, 255, 0.02)',
              backdropFilter: 'blur(10px)',
              color: activeTab === tab.id
                ? 'var(--standard-font-color)'
                : 'var(--light-font-color)',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              textAlign: 'left',
              width: '100%',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseOver={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.transform = 'translateX(4px)';
                e.currentTarget.style.color = 'var(--standard-font-color)';
              }
            }}
            onMouseOut={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                e.currentTarget.style.transform = 'translateX(0)';
                e.currentTarget.style.color = 'var(--light-font-color)';
              }
            }}
          >
            {/* Active indicator */}
            {activeTab === tab.id && (
              <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 4,
                background: 'var(--accent-color)',
                borderRadius: '0 2px 2px 0'
              }} />
            )}
            
            <div style={{
              fontSize: 24,
              lineHeight: 1,
              filter: activeTab === tab.id ? 'none' : 'grayscale(0.5)',
              transition: 'filter 0.3s ease'
            }}>
              {tab.icon}
            </div>
            
            <div style={{ flex: 1 }}>
              <div style={{
                fontSize: 16,
                fontWeight: activeTab === tab.id ? 700 : 600,
                marginBottom: 4,
                transition: 'font-weight 0.3s ease'
              }}>
                {tab.label}
              </div>
              <div style={{
                fontSize: 12,
                opacity: activeTab === tab.id ? 0.8 : 0.6,
                lineHeight: 1.3,
                transition: 'opacity 0.3s ease'
              }}>
                {tab.description}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Active Component */}
      <div style={{
        flex: 1,
        minWidth: 0, // Allow flex item to shrink
        position: 'relative'
      }}>
        <div
          key={activeTab} // Force re-mount when tab changes
          style={{
            animation: 'slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <ActiveComponent />
        </div>
      </div>

      {/* Mobile Tab Navigation (Hidden on Desktop) */}
      <div style={{
        display: 'none',
        position: 'fixed',
        bottom: 20,
        left: 20,
        right: 20,
        zIndex: 1000,
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        borderRadius: 20,
        backdropFilter: 'blur(20px)',
        padding: 8,
        justifyContent: 'space-around',
        boxShadow: 'var(--glass-shadow)'
      }}
      className="mobile-tab-nav"
      >
        {tabs.map((tab) => (
          <button
            key={`mobile-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              padding: '12px 8px',
              borderRadius: 12,
              border: 'none',
              background: activeTab === tab.id 
                ? 'var(--accent-color)' 
                : 'transparent',
              color: activeTab === tab.id
                ? 'white'
                : 'var(--light-font-color)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              minWidth: 60,
              fontSize: 10,
              fontWeight: 600
            }}
          >
            <div style={{ fontSize: 18 }}>{tab.icon}</div>
            <div>{tab.label.split(' ')[0]}</div>
          </button>
        ))}
      </div>

      {/* Add animations */}
      <style>{`
        @keyframes slideInRight {
          0% {
            opacity: 0;
            transform: translateX(20px);
          }
          100% {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @media (max-width: 768px) {
          .swap-tab-switcher {
            flex-direction: column !important;
            gap: 16px !important;
            padding-bottom: 100px !important;
          }
          
          .swap-tab-switcher > div:first-child {
            display: none !important;
          }
          
          .mobile-tab-nav {
            display: flex !important;
          }
        }

        @media (max-width: 480px) {
          .swap-tab-switcher {
            padding: 0 16px !important;
          }
        }
      `}</style>
    </div>
  );
}
