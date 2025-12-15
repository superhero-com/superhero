import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getNavigationItems } from './app-header/navigationItems';
import { useTranslation } from 'react-i18next';
import { useAeSdk } from '../../hooks/useAeSdk';
import { useModal } from '../../hooks/useModal';

export default function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('navigation');
  const { activeAccount } = useAeSdk();
  const { openModal } = useModal();
  const navigationItems = getNavigationItems(t);

  // Filter to only show Home, Trends, and Mini-Apps
  const mainNavItems = navigationItems
    .filter((item) => item.id === 'home' || item.id === 'trending' || item.id === 'dex')
    .map((item) => ({
      id: item.id,
      label: item.label,
      path: item.path,
      icon: item.icon,
    }));

  // Format wallet address for display
  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Wallet icon SVG
  const WalletIcon = ({ className }: { className?: string }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"></path>
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"></path>
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"></path>
    </svg>
  );

  const isActiveRoute = (path: string) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/trends/tokens') {
      // Check if we're on any trends route
      return location.pathname.startsWith('/trends') || location.pathname.startsWith('/trending');
    }
    if (path === '/apps') {
      // Check if we're on any mini-apps route
      return location.pathname.startsWith('/apps');
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10000]">
      {/* Liquid Glass Navigation Bar */}
      <div
        className="relative flex items-center justify-center gap-1 px-3 py-2.5 rounded-2xl"
        style={{
          background: 'rgba(15, 15, 20, 0.85)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          boxShadow: `
            0 8px 32px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(255, 255, 255, 0.05) inset,
            0 0 20px rgba(139, 92, 246, 0.2),
            0 0 40px rgba(139, 92, 246, 0.1)
          `,
        }}
      >
        {/* Navigation Items */}
        {mainNavItems.map((item) => {
          const isActive = isActiveRoute(item.path);
          
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`
                relative flex items-center gap-2 px-4 py-2.5 rounded-xl
                transition-all duration-300 ease-out
                ${isActive 
                  ? 'bg-gray-800/80' // Dark gray pill background for active
                  : 'bg-transparent hover:bg-white/5'
                }
              `}
              aria-label={item.label}
            >
              {/* Icon */}
              <div
                className={`
                  flex-shrink-0 transition-all duration-300
                  ${isActive 
                    ? 'text-[#00ff9d]' // Bright green for active icon
                    : 'text-white/60' // Gray for inactive icon
                  }
                `}
                style={{
                  filter: isActive ? 'drop-shadow(0 0 4px rgba(0, 255, 157, 0.6))' : 'none',
                }}
              >
                {item.icon}
              </div>

              {/* Label */}
              <span
                className={`
                  text-sm font-medium whitespace-nowrap transition-colors duration-300
                  ${isActive 
                    ? 'text-white' // White text for active
                    : 'text-white/60' // Gray text for inactive
                  }
                `}
              >
                {item.label}
              </span>
            </button>
          );
        })}

        {/* Wallet Button */}
        <button
          onClick={() => {
            if (activeAccount) {
              navigate(`/users/${activeAccount}`);
            } else {
              openModal({ name: 'connect-wallet' });
            }
          }}
          className={`
            relative flex items-center gap-2 px-4 py-2.5 rounded-xl
            transition-all duration-300 ease-out
            ${activeAccount 
              ? 'bg-gray-800/80' // Dark gray pill background when connected
              : 'bg-transparent hover:bg-white/5'
            }
          `}
          aria-label={activeAccount ? 'View Profile' : 'Connect Wallet'}
        >
          {/* Icon */}
          <div
            className={`
              flex-shrink-0 transition-all duration-300
              ${activeAccount 
                ? 'text-[#00ff9d]' // Bright green when connected
                : 'text-white/60' // Gray when not connected
              }
            `}
            style={{
              filter: activeAccount ? 'drop-shadow(0 0 4px rgba(0, 255, 157, 0.6))' : 'none',
            }}
          >
            <WalletIcon />
          </div>

          {/* Label or Address */}
          <span
            className={`
              text-sm font-medium whitespace-nowrap transition-colors duration-300
              ${activeAccount 
                ? 'text-white' // White text when connected
                : 'text-white/60' // Gray text when not connected
              }
            `}
          >
            {activeAccount ? formatAddress(activeAccount) : 'Wallet'}
          </span>
        </button>
      </div>
    </nav>
  );
}
