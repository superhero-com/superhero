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
    <div className="dex-layout">
      <div className="dex-container">
        {/* Main Layout with Sidebar */}
        <div className="dex-main-layout">
          {/* Sidebar Navigation */}
          <aside className="dex-sidebar">
            {/* Desktop: Separate sections */}
            <div className="dex-nav-section dex-desktop-nav">
              <div className="dex-nav-buttons">
                {navigationItems.map(renderNavigationButton)}
              </div>
            </div>

            <div className="dex-nav-section dex-desktop-nav">
              <h3 className="dex-section-title">Explore</h3>
              <div className="dex-nav-buttons">
                {exploreItems.map(renderNavigationButton)}
              </div>
            </div>

            {/* Mobile: Single line navigation */}
            <div className="dex-nav-section dex-mobile-nav">
              <div className={`dex-nav-buttons ${isExploreExpanded ? 'explore-expanded' : ''}`}>
                {!isExploreExpanded ? (
                  // Normal state: Show main navigation + Explore button
                  mobileNavigationItems.map((item) => {
                    if (item.id === 'explore') {
                      return (
                        <button
                          key={item.id}
                          onClick={handleExploreToggle}
                          className={`dex-nav-button ${isExploreActive() ? 'active' : ''}`}
                          title={item.description}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '16px 20px',
                            borderRadius: 16,
                            border: isExploreActive()
                              ? '2px solid var(--accent-color, #4caf50)'
                              : '1px solid var(--glass-border, rgba(255, 255, 255, 0.1))',
                            background: isExploreActive()
                              ? 'var(--glass-bg, rgba(76, 175, 80, 0.1))'
                              : 'rgba(255, 255, 255, 0.02)',
                            backdropFilter: 'blur(10px)',
                            color: isExploreActive()
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
                        >
                          {/* Active indicator */}
                          {isExploreActive() && (
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
                    }
                    return renderNavigationButton(item);
                  })
                ) : (
                  // Expanded state: Show explore items sliding from right + close button (transformed from explore)
                  <>
                    {/* Explore items that slide in from the right */}
                    {exploreItems.map((item, index) => {
                      return (
                      <button
                        key={item.id}
                        onClick={() => handleNavigation(item.path)}
                        className={`dex-nav-button dex-explore-item dex-explore-item-${index + 1} ${isActiveRoute(item.path) ? 'active' : ''}`}
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
                          animationDelay: `${0.1 + (index * 0.05)}s`
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
                    })}
                    
                    {/* Close button that stays in the same position as the original Explore button */}
                    <button
                      onClick={handleCloseExplore}
                      className="dex-nav-button dex-close-button"
                      title="Close explore menu"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '16px 20px',
                        borderRadius: 16,
                        border: '2px solid var(--accent-color, #ff6b6b)',
                        background: 'rgba(255, 107, 107, 0.05)',
                        backdropFilter: 'blur(10px)',
                        color: 'var(--accent-color, #ff6b6b)',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        textAlign: 'left',
                        width: '100%',
                        position: 'relative',
                        overflow: 'hidden',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}
                    >
                      <span className="dex-nav-icon" style={{ fontSize: '18px' }}>✕</span>
                      <span className="dex-nav-label">Close</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="dex-content">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
