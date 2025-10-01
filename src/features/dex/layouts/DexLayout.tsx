import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './DexLayout.scss';

interface NavigationItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  description: string;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'swap',
    label: 'SWAP',
    icon: '🔄',
    path: '/dex/swap',
    description: 'Trade any supported AEX-9 tokens'
  },
  {
    id: 'wrap',
    label: 'WRAP',
    icon: '📦',
    path: '/dex/wrap',
    description: 'Convert AE ↔ WAE'
  },
  {
    id: 'bridge',
    label: 'BRIDGE',
    icon: '🌉',
    path: '/dex/bridge',
    description: 'Bridge ETH to æternity'
  },
  {
    id: 'pool',
    label: 'POOL',
    icon: '💧',
    path: '/dex/pool',
    description: 'Manage liquidity positions'
  }
];

const exploreItems: NavigationItem[] = [
  {
    id: 'tokens',
    label: 'Tokens',
    icon: '🪙',
    path: '/dex/explore/tokens',
    description: 'Browse all available tokens'
  },
  {
    id: 'pools',
    label: 'Pools',
    icon: '🏊',
    path: '/dex/explore/pools',
    description: 'Explore liquidity pools'
  },
  {
    id: 'transactions',
    label: 'Transactions',
    icon: '📋',
    path: '/dex/explore/transactions',
    description: 'Track recent activity'
  }
];

interface DexLayoutProps {
  children: React.ReactNode;
}

export default function DexLayout({ children }: DexLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isExploreExpanded, setIsExploreExpanded] = useState(false);

  const isActiveRoute = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsExploreExpanded(false);
  };

  // Check if any explore route is active
  const isExploreActive = () => {
    return exploreItems.some(item => isActiveRoute(item.path));
  };

  const handleExploreToggle = () => {
    setIsExploreExpanded(!isExploreExpanded);
  };

  const handleCloseExplore = () => {
    setIsExploreExpanded(false);
  };

  // Mobile navigation items with Explore button instead of individual explore items
  const mobileNavigationItems = [
    ...navigationItems,
    {
      id: 'explore',
      label: 'Explore',
      icon: '🔍',
      path: '/dex/explore',
      description: 'Explore tokens, pools, and transactions'
    }
  ];

  const renderMobileNavigationButton = (item: NavigationItem) => (
    <button
      key={item.id}
      onClick={() => handleNavigation(item.path)}
      className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-all duration-200 ${
        isActiveRoute(item.path) 
          ? 'text-primary bg-primary/10' 
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
      }`}
      title={item.description}
      style={{
        minWidth: '60px',
        height: '56px',
      }}
    >
      <span className="text-xl">{item.icon}</span>
      <span className="text-xs font-medium leading-none">{item.label}</span>
    </button>
  );

  const renderNavigationButton = (item: NavigationItem) => (
    <button
      key={item.id}
      onClick={() => handleNavigation(item.path)}
      className={`dex-nav-button ${isActiveRoute(item.path) ? 'active' : ''}`}
      title={item.description}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '16px 20px',
        borderRadius: 16,
        border: isActiveRoute(item.path)
          ? '2px solid var(--accent-color, #4caf50)'
          : '1px solid var(--glass-border, rgba(255, 255, 255, 0.1))',
        background: isActiveRoute(item.path)
          ? 'var(--glass-bg, rgba(76, 175, 80, 0.1))'
          : 'rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(10px)',
        color: isActiveRoute(item.path)
          ? 'var(--standard-font-color, #ffffff)'
          : 'var(--light-font-color, #9aa)',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        textAlign: 'left',
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        fontSize: '14px',
        fontWeight: '500',
        boxShadow: 'none',
        transform: 'none'
      }}
    >
      {/* Active indicator */}
      {isActiveRoute(item.path) && (
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: 'var(--accent-color, #4caf50)',
          borderRadius: '0 2px 2px 0'
        }} />
      )}
      <span className="dex-nav-icon" style={{ fontSize: '18px' }}>{item.icon}</span>
      <span className="dex-nav-label">{item.label}</span>
    </button>
  );

  return (
    <>
      <div className="min-h-screen w-full max-w-[min(1400px,100%)] mx-auto flex flex-col pb-24 md:pb-0">
        {/* Top pill navigation for tablet/desktop */}
        <div className="hidden md:block sticky top-0 z-30 md:h-[50px]">
          <div className="w-full px-2 py-2 md:px-3 md:py-0 h-full flex items-center">
            <div className="flex items-center gap-2 md:gap-3 flex-wrap">
              {navigationItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.path)}
                  aria-label={item.label}
                  title={item.description}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 9999,
                    border: isActiveRoute(item.path)
                      ? '1.5px solid var(--accent-color, #4caf50)'
                      : '1px solid rgba(255,255,255,0.08)',
                    background: isActiveRoute(item.path)
                      ? 'rgba(76, 175, 80, 0.12)'
                      : 'rgba(255,255,255,0.06)',
                    color: isActiveRoute(item.path)
                      ? 'var(--standard-font-color, #ffffff)'
                      : 'var(--light-font-color, #9aa)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    boxShadow: 'none',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <span style={{ fontSize: 16 }}>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}

              {/* Explore group */}
              <div className="hidden md:flex items-center gap-2 md:ml-2">
                <span style={{
                  fontSize: 12,
                  opacity: 0.7,
                  paddingLeft: 6,
                  paddingRight: 4
                }}>Explore</span>
                {exploreItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.path)}
                    aria-label={item.label}
                    title={item.description}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 9999,
                      border: isActiveRoute(item.path)
                        ? '1.5px solid var(--accent-color, #4caf50)'
                        : '1px solid rgba(255,255,255,0.08)',
                      background: isActiveRoute(item.path)
                        ? 'rgba(76, 175, 80, 0.12)'
                        : 'rgba(255,255,255,0.06)',
                      color: isActiveRoute(item.path)
                        ? 'var(--standard-font-color, #ffffff)'
                        : 'var(--light-font-color, #9aa)',
                      fontSize: 12,
                      fontWeight: 600,
                      boxShadow: 'none'
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-grow grid grid-cols-1 gap-0 p-1 px-2 md:gap-0 md:p-1 md:px-2">
          <main className="min-w-0 overflow-hidden pt-1">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile: Horizontal bottom navigation (kept for small screens) */}
      <div
        className="block md:hidden w-full fixed bottom-0 left-0 right-0 z-[900] p-2 pb-3 border-t"
        style={{
          backgroundColor: 'rgba(12, 12, 20, 0.5)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTopColor: 'rgba(255, 255, 255, 0.14)',
          boxShadow: '0 -6px 28px rgba(0,0,0,0.35)'
        }}
      >
        <div className={`flex items-center justify-around gap-1 ${isExploreExpanded ? 'explore-expanded' : ''}`}>
          {!isExploreExpanded ? (
            mobileNavigationItems.map((item) => {
              if (item.id === 'explore') {
                return (
                  <button
                    key={item.id}
                    onClick={handleExploreToggle}
                    className={`flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-all duration-200 ${
                      isExploreActive() 
                        ? 'text-primary bg-primary/10' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                    title={item.description}
                    style={{
                      minWidth: '60px',
                      height: '56px',
                    }}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="text-xs font-medium leading-none">{item.label}</span>
                  </button>
                );
              }
              return renderMobileNavigationButton(item);
            })
          ) : (
            <>
              {exploreItems.map((item) => renderMobileNavigationButton(item))}
              <button
                onClick={handleCloseExplore}
                className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-all duration-200 text-destructive hover:bg-destructive/10"
                title="Close explore menu"
                style={{
                  minWidth: '60px',
                  height: '56px',
                }}
              >
                <span className="text-xl">✕</span>
                <span className="text-xs font-medium leading-none">Close</span>
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
