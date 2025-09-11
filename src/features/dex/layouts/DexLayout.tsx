import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

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
    label: 'Swap Tokens',
    icon: '🔄',
    path: '/dex/swap',
    description: 'Trade any supported AEX-9 tokens'
  },
  {
    id: 'wrap',
    label: 'Wrap/Unwrap',
    icon: '📦',
    path: '/dex/wrap',
    description: 'Convert AE ↔ WAE'
  },
  {
    id: 'bridge',
    label: 'ETH Bridge',
    icon: '🌉',
    path: '/dex/bridge',
    description: 'Bridge ETH to æternity'
  },
  {
    id: 'pool',
    label: 'Pool',
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
        fontWeight: '500'
      }}
      onMouseOver={(e) => {
        if (!isActiveRoute(item.path)) {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
          e.currentTarget.style.transform = 'translateX(4px)';
          e.currentTarget.style.color = 'var(--standard-font-color, #ffffff)';
        }
      }}
      onMouseOut={(e) => {
        if (!isActiveRoute(item.path)) {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
          e.currentTarget.style.transform = 'translateX(0)';
          e.currentTarget.style.color = 'var(--light-font-color, #9aa)';
        }
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
    <div className="text-text-color">
      <div className="w-full max-w-[min(1648px,100%)] mx-auto">
        {/* Main Layout with Sidebar */}
        <div className="flex items-start flex-col gap-0 pb-20 px-4 lg:flex-row lg:gap-6 lg:pb-0 lg:px-0">
          {/* Sidebar Navigation */}
          <aside className="lg:min-w-[240px] lg:w-[240px] lg:flex-shrink-0 lg:relative lg:bg-transparent lg:border-0 lg:backdrop-blur-0 lg:z-auto lg:p-0 lg:pb-0 lg:shadow-none lg:block fixed bottom-0 left-0 right-0 w-full min-w-full bg-card-bg border-t border-border-color backdrop-blur-[20px] z-[1000] p-2 pb-3 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] flex items-center justify-center">
            {/* Desktop: Separate sections */}
            <div className="mb-6 hidden lg:block">
              <div className="flex flex-col gap-2">
                {navigationItems.map(renderNavigationButton)}
              </div>
            </div>

            <div className="mb-6 hidden lg:block">
              <h3 className="text-base font-semibold mb-3 text-text-primary opacity-80">Explore</h3>
              <div className="flex flex-col gap-2">
                {exploreItems.map(renderNavigationButton)}
              </div>
            </div>

            {/* Mobile: Horizontal bottom navigation */}
            <div className="block lg:hidden w-full">
              <div className={`flex items-center justify-around gap-1 ${isExploreExpanded ? 'explore-expanded' : ''}`}>
                {!isExploreExpanded ? (
                  // Normal state: Show main navigation + Explore button
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
                  // Expanded state: Show explore items sliding from right + close button (transformed from explore)
                  <>
                    {/* Explore items that slide in from the right */}
                    {exploreItems.map((item) => renderMobileNavigationButton(item))}
                    
                    {/* Close button that stays in the same position as the original Explore button */}
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
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-h-[calc(100vh-140px)] lg:min-h-[400px]">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
