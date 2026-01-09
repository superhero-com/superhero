import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSectionTheme, SectionTheme } from "./AppLayout";
import { useTheme } from "@/contexts/ThemeContext";
import { useOnboarding } from "@/contexts/OnboardingContext";
import ConnectWalletButton from "../ConnectWalletButton";
import ThemeSwitcher from "./ThemeSwitcher";
import { useAeSdk } from "@/hooks/useAeSdk";
import { useAccountBalances } from "@/hooks/useAccountBalances";
import { useWallet } from "@/hooks";
import AddressAvatarWithChainName from "@/@components/Address/AddressAvatarWithChainName";

/**
 * LeftSidebar - Swiss Minimal Design
 * - Clean, typography-focused
 * - No rounded corners
 * - Minimal color (black/white + accent)
 * - Strong hierarchy
 */

// Haptic feedback utility
const triggerHaptic = (pattern: number | number[] = 10) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {}
  }
};

interface NavItem {
  id: string;
  label: string;
  emoji: string;
  path: string;
  theme: SectionTheme;
}

const navItems: NavItem[] = [
  { id: "home", label: "Home", emoji: "🏠", path: "/", theme: "topics" },
  { id: "hashtags", label: "Hashtags", emoji: "🔥", path: "/trends/tokens", theme: "topics" },
  { id: "defi", label: "DeFi", emoji: "💎", path: "/defi/swap", theme: "defi" },
];

const subNavItems: Record<string, { id: string; label: string; path: string }[]> = {
  hashtags: [
    { id: "explore", label: "Explore", path: "/trends/tokens" },
    { id: "create", label: "Create", path: "/trends/create" },
    { id: "daos", label: "DAOs", path: "/trends/daos" },
    { id: "leaderboard", label: "Leaderboard", path: "/trends/leaderboard" },
    { id: "invite", label: "Invite & Earn", path: "/trends/invite" },
  ],
  defi: [
    { id: "swap", label: "Swap", path: "/defi/swap" },
    { id: "pool", label: "Pool", path: "/defi/pool" },
    { id: "wrap", label: "Wrap", path: "/defi/wrap" },
    { id: "bridge", label: "Bridge", path: "/defi/bridge" },
    { id: "buy-ae", label: "Buy AE", path: "/defi/buy-ae-with-eth" },
  ],
};

export default function LeftSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { colors } = useSectionTheme();
  const { isDark } = useTheme();
  const { startOnboarding, hasSeenOnboarding, resetOnboarding } = useOnboarding();
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // Wallet data
  const { activeAccount } = useAeSdk();
  const { decimalBalance } = useAccountBalances(activeAccount);
  const { chainNames } = useWallet();
  const chainName = activeAccount ? chainNames?.[activeAccount] : null;
  const balanceAe = Number(decimalBalance?.toString() || 0);

  // Don't auto-expand - only expand manually or when on a specific sub-route
  const getExpandedFromRoute = (pathname: string): Set<string> => {
    const expanded = new Set<string>();
    // Only expand if user is on a specific sub-page (not home or main section page)
    if (pathname.startsWith("/trends/") && pathname !== "/trends/tokens") {
      expanded.add("hashtags");
    }
    if (pathname.startsWith("/defi/") && pathname !== "/defi/swap") {
      expanded.add("defi");
    }
    return expanded;
  };

  const [expandedItems, setExpandedItems] = useState<Set<string>>(() => getExpandedFromRoute(location.pathname));

  React.useEffect(() => {
    // Only auto-expand when navigating to sub-pages
    const newExpanded = getExpandedFromRoute(location.pathname);
    if (newExpanded.size > 0) {
      setExpandedItems(prev => {
        const next = new Set(prev);
        newExpanded.forEach(item => next.add(item));
        return next;
      });
    }
  }, [location.pathname]);

  React.useEffect(() => {
    const handleExpandMenu = (event: CustomEvent<{ menuId: string }>) => {
      const { menuId } = event.detail;
      setExpandedItems((prev) => {
        const next = new Set(prev);
        next.add(menuId);
        return next;
      });
    };
    window.addEventListener("expand-sidebar-menu" as any, handleExpandMenu);
    return () => {
      window.removeEventListener("expand-sidebar-menu" as any, handleExpandMenu);
    };
  }, []);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    if (path === "/trends/tokens") {
      return location.pathname.startsWith("/trends") && 
        !location.pathname.includes("/create") && 
        !location.pathname.includes("/daos") && 
        !location.pathname.includes("/leaderboard") && 
        !location.pathname.includes("/invite");
    }
    return location.pathname.startsWith(path);
  };

  const isParentActive = (item: NavItem) => {
    if (item.id === "home") return location.pathname === "/";
    if (item.id === "hashtags") return location.pathname.startsWith("/trends") || location.pathname === "/";
    return location.pathname.startsWith(item.path);
  };

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleNavClick = (item: NavItem) => {
    triggerHaptic(15);
    
    if (item.id === "home") {
      navigate("/");
      setMobileOpen(false);
      return;
    }
    
    if (subNavItems[item.id]) {
      toggleExpand(item.id);
      if (!expandedItems.has(item.id)) {
        navigate(item.path);
      }
    } else {
      navigate(item.path);
    }
    setMobileOpen(false);
  };

  // Swiss colors - improved visibility
  const textPrimary = isDark ? '#FFFFFF' : '#000000';
  const textSecondary = isDark ? '#A1A1AA' : '#52525B'; // Improved contrast
  const borderColor = isDark ? '#27272A' : '#E4E4E7';
  const bgColor = isDark ? '#09090B' : '#FFFFFF';
  const hoverBg = isDark ? '#18181B' : '#F4F4F5';
  
  // Section-specific accent colors - Swiss Red
  const getAccentColor = (theme: SectionTheme): string => {
    switch (theme) {
      case 'defi': return '#22C55E'; // Green
      case 'topics':
      case 'social':
      default: return '#EF4444'; // Swiss Red
    }
  };
  
  // Current section accent (for logo and global elements)
  const currentAccent = colors.primary;

  const sidebarContent = (
    <>
      {/* Logo */}
      <div 
        className="px-5 py-5"
        style={{ borderBottom: `1px solid ${borderColor}` }}
      >
        <Link
          to="/"
          className="flex items-center gap-3 no-underline no-gradient-text"
          onClick={() => setMobileOpen(false)}
        >
          {/* Minimal square logo - uses current section accent */}
          <div 
            className="w-8 h-8 flex items-center justify-center transition-colors duration-500"
            style={{ background: currentAccent }}
          >
            <svg width="18" height="14" viewBox="0 0 42 30" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                fillRule="evenodd" 
                clipRule="evenodd" 
                d="M0.105957 10.1933L11.0668 0.294678H30.5399L41.5008 10.1933L20.8617 29.6529L0.105957 10.1933ZM12.2912 3.33174H18.2381L30.948 15.8737L20.8034 25.4348L4.65355 10.2495L12.2912 3.33174Z" 
                fill="#FFFFFF"
              />
            </svg>
          </div>
          <span 
            className="text-base font-semibold tracking-tight"
            style={{ color: textPrimary }}
          >
            Superhero
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 overflow-y-auto flex flex-col">
        <ul className="space-y-1 flex-1">
          {navItems.map((item) => {
            const active = isParentActive(item);
            const expanded = expandedItems.has(item.id);
            const hasChildren = !!subNavItems[item.id];
            const itemAccent = getAccentColor(item.theme);

            return (
              <li key={item.id}>
                <button
                  id={`nav-${item.id}`}
                  type="button"
                  onClick={() => handleNavClick(item)}
                  className="w-full flex items-center justify-between px-5 py-2.5 text-left transition-all duration-300"
                  style={{
                    color: active ? textPrimary : textSecondary,
                    background: active ? hoverBg : 'transparent',
                  }}
                >
                  <div className="flex items-center gap-3">
                    {/* Active indicator - uses item's theme accent */}
                    <span 
                      className="w-1.5 h-1.5 transition-all duration-300"
                      style={{ 
                        background: active ? itemAccent : 'transparent',
                      }}
                    />
                    {/* Emoji */}
                    <span className="text-base">{item.emoji}</span>
                    <span 
                      className="text-sm tracking-wide transition-colors duration-300"
                      style={{ 
                        fontWeight: active ? 600 : 500,
                        color: active ? itemAccent : undefined,
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                  {hasChildren && (
                    <svg
                      className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      style={{ color: textSecondary }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>

                {/* Sub-items */}
                {hasChildren && expanded && (
                  <ul className="mt-1 space-y-0.5">
                    {subNavItems[item.id].map((child) => {
                      const childActive = isActive(child.path);
                      return (
                        <li key={child.id}>
                          <Link
                            id={`nav-${item.id}-${child.id}`}
                            to={child.path}
                            onClick={() => {
                              triggerHaptic(10);
                              setMobileOpen(false);
                            }}
                            className="block pl-12 pr-5 py-2 text-sm no-underline no-gradient-text transition-colors"
                            style={{
                              color: childActive ? textPrimary : textSecondary,
                              fontWeight: childActive ? 500 : 400,
                              background: childActive ? hoverBg : 'transparent',
                            }}
                          >
                            {child.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>

        {/* Wallet Section - at bottom of navigation */}
        <div className="px-4 pt-4 mt-auto">
          {activeAccount ? (
            /* Wallet Card - Swiss Minimal */
            <div 
              className="relative overflow-hidden cursor-pointer group"
              onClick={() => navigate(`/users/${activeAccount}`)}
              style={{
                background: `linear-gradient(135deg, ${currentAccent}15 0%, ${isDark ? '#18181B' : '#F4F4F5'} 50%, ${currentAccent}10 100%)`,
                border: `1px solid ${borderColor}`,
              }}
            >
              {/* Card Pattern Overlay */}
              <div 
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: `
                    radial-gradient(circle at 100% 0%, ${currentAccent}40 0%, transparent 50%),
                    radial-gradient(circle at 0% 100%, ${currentAccent}30 0%, transparent 40%)
                  `,
                }}
              />
              
              {/* Card Content */}
              <div className="relative p-4">
                {/* Avatar */}
                <div className="flex items-center gap-3 mb-3">
                  <AddressAvatarWithChainName
                    address={activeAccount}
                    size={40}
                    overlaySize={18}
                    showBalance={false}
                    showAddressAndChainName={false}
                    showPrimaryOnly={true}
                    hideFallbackName={true}
                    isHoverEnabled={false}
                  />
                </div>
                
                {/* Balance */}
                <div>
                  <div 
                    className="text-[10px] uppercase tracking-wider mb-0.5"
                    style={{ color: textSecondary }}
                  >
                    Balance
                  </div>
                  <div 
                    className="text-xl font-bold tracking-tight"
                    style={{ color: textPrimary }}
                  >
                    {balanceAe.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    <span 
                      className="text-xs font-medium ml-1"
                      style={{ color: currentAccent }}
                    >
                      AE
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Hover Effect */}
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: `linear-gradient(135deg, ${currentAccent}10 0%, transparent 100%)`,
                }}
              />
            </div>
          ) : (
            <ConnectWalletButton block />
          )}
        </div>
      </nav>

      {/* AI Assistant */}
      <div 
        className="px-5 py-4"
        style={{ borderTop: `1px solid ${borderColor}` }}
      >
        <a
          href="https://quali.chat"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-3 no-underline no-gradient-text transition-colors"
          style={{
            background: hoverBg,
            border: `1px solid ${borderColor}`,
          }}
        >
          <div 
            className="w-8 h-8 flex items-center justify-center transition-colors duration-500"
            style={{ background: currentAccent }}
          >
            <svg className="w-4 h-4" fill="none" stroke="#FFFFFF" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <span 
              className="text-sm font-medium block"
              style={{ color: textPrimary }}
            >
              AI Assistant
            </span>
            <span 
              className="text-xs"
              style={{ color: textSecondary }}
            >
              QualiChat
            </span>
          </div>
          <svg 
            className="w-3 h-3" 
            fill="none" 
            stroke={textSecondary}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      {/* Theme + Tour Row */}
      <div className="px-5 pb-4 flex items-center gap-2">
        <ThemeSwitcher />
        {hasSeenOnboarding && (
          <button
            type="button"
            onClick={() => {
              resetOnboarding();
              startOnboarding();
              setMobileOpen(false);
            }}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs transition-colors"
            style={{ 
              color: textSecondary,
              border: `1px solid ${borderColor}`,
              height: '36px',
            }}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Take a Tour</span>
          </button>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-[1001] p-2"
        style={{ 
          background: bgColor,
          border: `1px solid ${borderColor}`,
        }}
        aria-label="Open menu"
      >
        <svg 
          className="w-5 h-5" 
          fill="none" 
          stroke={textPrimary}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:flex lg:flex-col fixed top-0 left-0 bottom-0 w-[280px] z-[100] transition-colors"
        style={{ 
          background: bgColor,
          borderRight: `1px solid ${borderColor}`,
        }}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 z-[1000]"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`
          lg:hidden fixed top-0 left-0 bottom-0 w-[280px] z-[1001]
          transform transition-transform duration-300 ease-in-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          flex flex-col
        `}
        style={{ 
          background: bgColor,
          borderRight: `1px solid ${borderColor}`,
        }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-2"
          aria-label="Close menu"
        >
          <svg 
            className="w-4 h-4" 
            fill="none" 
            stroke={textSecondary}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {sidebarContent}
      </aside>
    </>
  );
}
