import React, { useState } from 'react';
import SwapForm from './SwapForm';
import { WrapUnwrapWidget } from '../../../features/dex';
import { EthBridgeWidget } from '../../../features/bridge';
import { AeButton } from '../../ui/ae-button';
import { AeCard, AeCardContent } from '../../ui/ae-card';
import { Badge } from '../../ui/badge';
import { cn } from '@/lib/utils';

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
    label: 'SWAP',
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
      className={cn("flex gap-6 max-w-6xl mx-auto", className)}
      style={style}
    >
      {/* Vertical Tab Navigation */}
      <div className="flex flex-col gap-2 min-w-[200px] flex-shrink-0">
        {tabs.map((tab) => (
          <AeCard
            key={tab.id}
            variant="glass"
            className={cn(
              "cursor-pointer transition-all duration-300 hover:shadow-glow",
              activeTab === tab.id 
                ? "border-accent shadow-glow" 
                : "border-glass-border hover:border-accent/50"
            )}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: activeTab === tab.id
                ? "radial-gradient(1200px 400px at -20% -40%, rgba(78, 205, 196, 0.08), transparent 40%), rgba(78, 205, 196, 0.04)"
                : "radial-gradient(1200px 400px at -20% -40%, rgba(255,255,255,0.04), transparent 40%), rgba(255, 255, 255, 0.02)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)"
            }}
          >
            <AeCardContent className="p-4 relative">
              {/* Active indicator */}
              {activeTab === tab.id && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent rounded-r-sm" />
              )}
              
              <div className="flex items-center gap-3">
                <div 
                  className={cn(
                    "text-2xl transition-all duration-300",
                    activeTab === tab.id ? "filter-none" : "grayscale opacity-60"
                  )}
                >
                  {tab.icon}
                </div>
                
                <div className="flex-1">
                  <div className={cn(
                    "text-sm font-semibold mb-1 transition-colors",
                    activeTab === tab.id ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {tab.label}
                  </div>
                  <div className={cn(
                    "text-xs leading-tight transition-colors",
                    activeTab === tab.id ? "text-muted-foreground" : "text-muted-foreground/60"
                  )}>
                    {tab.description}
                  </div>
                </div>
              </div>
            </AeCardContent>
          </AeCard>
        ))}
      </div>

      {/* Active Component */}
      <div className="flex-1 min-w-0 relative">
        <div
          key={activeTab} // Force re-mount when tab changes
          className="animate-in slide-in-from-right-4 duration-300"
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
