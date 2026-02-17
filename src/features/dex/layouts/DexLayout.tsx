import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  ArrowLeftRight, 
  Droplet, 
  Package, 
  Network, 
  Gem, 
  Coins, 
  Waves, 
  ClipboardList, 
  Search,
  X,
  LucideIcon
} from 'lucide-react';
import './DexLayout.scss';

interface NavigationItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  description: string;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'swap',
    label: 'SWAP',
    icon: ArrowLeftRight,
    path: '/defi/swap',
    description: 'Trade any supported AEX-9 tokens',
  },
  {
    id: 'pool',
    label: 'POOL',
    icon: Droplet,
    path: '/defi/pool',
    description: 'Manage liquidity positions',
  },
  {
    id: 'wrap',
    label: 'WRAP',
    icon: Package,
    path: '/defi/wrap',
    description: 'Convert AE ↔ WAE',
  },
  {
    id: 'bridge',
    label: 'BRIDGE',
    icon: Network,
    path: '/defi/bridge',
    description: 'Bridge tokens between Ethereum and æternity',
  },
  {
    id: 'buy-ae',
    label: 'BUY AE',
    icon: Gem,
    path: '/defi/buy-ae-with-eth',
    description: 'Buy AE with ETH',
  },
];

const exploreItems: NavigationItem[] = [
  {
    id: 'tokens',
    label: 'Tokens',
    icon: Coins,
    path: '/defi/explore/tokens',
    description: 'Browse all available tokens',
  },
  {
    id: 'pools',
    label: 'Pools',
    icon: Waves,
    path: '/defi/explore/pools',
    description: 'Explore liquidity pools',
  },
  {
    id: 'transactions',
    label: 'Transactions',
    icon: ClipboardList,
    path: '/defi/explore/transactions',
    description: 'Track recent activity',
  },
];

interface DexLayoutProps {
  children: React.ReactNode;
}

const DexLayout = ({ children }: DexLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isExploreExpanded, setIsExploreExpanded] = useState(false);

  const isActiveRoute = (path: string) => (
    location.pathname === path || location.pathname.startsWith(`${path}/`)
  );

  const handleNavigation = (path: string) => {
    navigate(path);
    setIsExploreExpanded(false);
  };

  // Check if any explore route is active
  const isExploreActive = () => exploreItems.some((item) => isActiveRoute(item.path));

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
      icon: Search,
      path: '/defi/explore',
      description: 'Explore tokens, pools, and transactions',
    },
  ];

  const renderMobileNavigationButton = (item: NavigationItem) => {
    const isActive = isActiveRoute(item.path);
    const Icon = item.icon;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => handleNavigation(item.path)}
        className={`pb-1 transition-colors flex-1 ${
          isActive
            ? 'border-b-2 border-[#4ecdc4]'
            : 'border-b-2 border-transparent'
        }`}
        title={item.description}
      >
        <span className="flex flex-col items-center gap-1">
          <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-white/60'}`} />
          <span className={`text-[11px] leading-tight ${isActive ? 'font-semibold text-white' : 'text-white/60'}`}>
            {item.label}
          </span>
        </span>
      </button>
    );
  };

  return (
    <>
      <div className="min-h-screen w-full max-w-[min(1400px,100%)] mx-auto flex flex-col pt-14 md:pt-0">
        {/* Top pill navigation for tablet/desktop */}
        <div className="hidden md:block sticky top-0 z-30 md:mb-2">
          <div className="w-full px-2 py-2 md:px-3 md:py-0 h-full flex items-center">
            <div className="flex items-center gap-2 md:gap-3 flex-wrap">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = isActiveRoute(item.path);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigation(item.path)}
                    aria-label={item.label}
                    title={item.description}
                    className={`
                      flex items-center gap-2 px-3.5 py-2.5 rounded-full
                      border-[1.5px] text-[13px] font-semibold backdrop-blur-[10px]
                      transition-all duration-200
                      ${isActive
                        ? 'border-[#4caf50] bg-[rgba(76,175,80,0.12)] text-white'
                        : 'border-white/[0.08] bg-white/[0.06] text-[#9aa] hover:bg-white/[0.1]'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              {/* Explore group */}
              <div className="hidden md:flex items-center gap-2 md:pl-[76px]">
                <span className="text-xs opacity-70 pl-1.5 pr-1">
                  Explore
                </span>
                {exploreItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = isActiveRoute(item.path);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavigation(item.path)}
                      aria-label={item.label}
                      title={item.description}
                      className={`
                        flex items-center gap-1.5 px-3 py-2 rounded-full
                        border-[1.5px] text-xs font-semibold
                        transition-all duration-200
                        ${isActive
                          ? 'border-[#4caf50] bg-[rgba(76,175,80,0.12)] text-white'
                          : 'border-white/[0.08] bg-white/[0.06] text-[#9aa] hover:bg-white/[0.1]'
                        }
                      `}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-grow grid grid-cols-1 gap-0 p-1 px-2 md:gap-0 md:p-1 md:px-4">
          <main className="min-w-0 overflow-hidden pt-1">{children}</main>
        </div>
      </div>

      {/* Mobile: Horizontal top navigation tabs (positioned after header) */}
      <div className="block md:hidden w-full fixed top-16 left-0 right-0 z-[900] border-b border-white/10 bg-[#0a0a0f]/70 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
        <div className="pt-4 pb-2">
          <div className="px-2">
            <div className="flex items-center justify-between w-full">
              {!isExploreExpanded ? (
                mobileNavigationItems.map((item) => {
                  if (item.id === 'explore') {
                    const isActive = isExploreActive();
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={handleExploreToggle}
                        className={`pb-1 transition-colors flex-1 ${
                          isActive
                            ? 'border-b-2 border-[#4ecdc4]'
                            : 'border-b-2 border-transparent'
                        }`}
                        title={item.description}
                      >
                        <span className="flex flex-col items-center gap-1">
                          <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-white/60'}`} />
                          <span className={`text-[14px] leading-tight ${isActive ? 'font-semibold text-white' : 'text-white/60'}`}>
                            {item.label}
                          </span>
                        </span>
                      </button>
                    );
                  }
                  return renderMobileNavigationButton(item);
                })
              ) : (
                <>
                  {exploreItems.map((item) => renderMobileNavigationButton(item))}
                  <button
                    type="button"
                    onClick={handleCloseExplore}
                    className="pb-1 transition-colors border-b-2 border-transparent flex-1"
                    title="Close explore menu"
                  >
                    <span className="flex flex-col items-center gap-1">
                      <X className="h-5 w-5 text-destructive" />
                      <span className="text-[11px] leading-tight text-destructive">Close</span>
                    </span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DexLayout;
