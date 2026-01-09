import React, { useState, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSectionTheme, SectionTheme } from "./AppLayout";
import { useTheme } from "@/contexts/ThemeContext";
import { useOnboarding } from "@/contexts/OnboardingContext";

// Haptic feedback utility - triggers device vibration if supported
const triggerHaptic = (pattern: number | number[] = 10) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // Silently fail if vibration not supported
    }
  }
};

interface NavItem {
  id: string;
  label: string;
  path: string;
  theme: SectionTheme;
  icon: React.ReactNode;
  children?: { id: string; label: string; path: string }[];
}

// Custom SVG Icons for each section
const HomeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const HashtagIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
  </svg>
);

const DeFiIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const navItems: NavItem[] = [
  {
    id: "home",
    label: "Home",
    path: "/",
    theme: "topics",
    icon: <HomeIcon />,
  },
  {
    id: "hashtags",
    label: "Hashtags",
    path: "/trends/tokens",
    theme: "topics",
    icon: <HashtagIcon />,
    children: [
      { id: "explore", label: "Explore", path: "/trends/tokens" },
      { id: "create", label: "Create", path: "/trends/create" },
      { id: "daos", label: "DAOs", path: "/trends/daos" },
      { id: "leaderboard", label: "Leaderboard", path: "/trends/leaderboard" },
      { id: "invite", label: "Invite & Earn", path: "/trends/invite" },
    ],
  },
  {
    id: "defi",
    label: "DeFi",
    path: "/defi/swap",
    theme: "defi",
    icon: <DeFiIcon />,
    children: [
      { id: "swap", label: "Swap", path: "/defi/swap" },
      { id: "pool", label: "Pool", path: "/defi/pool" },
      { id: "wrap", label: "Wrap", path: "/defi/wrap" },
      { id: "bridge", label: "Bridge", path: "/defi/bridge" },
      { id: "buy-ae", label: "Buy AE", path: "/defi/buy-ae-with-eth" },
    ],
  },
];

const themeColors: Record<SectionTheme, { active: string; hover: string; border: string }> = {
  topics: {
    active: "#06B6D4",
    hover: "rgba(6, 182, 212, 0.1)",
    border: "#06B6D4",
  },
  social: {
    active: "#8B5CF6",
    hover: "rgba(139, 92, 246, 0.1)",
    border: "#8B5CF6",
  },
  defi: {
    active: "#10B981",
    hover: "rgba(16, 185, 129, 0.1)",
    border: "#10B981",
  },
  default: {
    active: "#06B6D4",
    hover: "rgba(6, 182, 212, 0.1)",
    border: "#06B6D4",
  },
};

export default function LeftSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme: currentTheme, colors } = useSectionTheme();
  const { isDark } = useTheme();
  const { startOnboarding, hasSeenOnboarding, resetOnboarding } = useOnboarding();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Auto-expand based on current route
  const getExpandedFromRoute = (pathname: string): Set<string> => {
    const expanded = new Set<string>();
    if (pathname.startsWith("/trends") || pathname === "/") {
      expanded.add("hashtags");
    }
    if (pathname.startsWith("/defi")) {
      expanded.add("defi");
    }
    return expanded;
  };

  const [expandedItems, setExpandedItems] = useState<Set<string>>(() => getExpandedFromRoute(location.pathname));

  React.useEffect(() => {
    setExpandedItems(getExpandedFromRoute(location.pathname));
  }, [location.pathname]);

  // Expose a function to expand specific menu items (for onboarding)
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
      return location.pathname.startsWith("/trends") && !location.pathname.includes("/create") && !location.pathname.includes("/daos") && !location.pathname.includes("/leaderboard") && !location.pathname.includes("/invite");
    }
    return location.pathname.startsWith(path);
  };

  const isParentActive = (item: NavItem) => {
    if (item.id === "home") return location.pathname === "/";
    if (item.id === "hashtags") return location.pathname.startsWith("/trends") || location.pathname === "/";
    if (item.children) {
      return item.children.some((child) => isActive(child.path));
    }
    return isActive(item.path);
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
    // Trigger haptic feedback on navigation
    triggerHaptic(15);
    
    if (item.id === "home") {
      navigate("/");
      setMobileOpen(false);
      return;
    }
    if (item.children && item.children.length > 0) {
      toggleExpand(item.id);
      if (!expandedItems.has(item.id)) {
        navigate(item.path);
      }
    } else {
      navigate(item.path);
    }
    setMobileOpen(false);
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className={`px-5 py-5 border-b ${isDark ? "border-slate-700" : "border-gray-200"}`}>
        <Link
          to="/"
          className="flex items-center gap-3 no-underline no-gradient-text"
          onClick={() => setMobileOpen(false)}
        >
          <div 
            className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden"
            style={{ background: colors.gradient }}
          >
            {/* Superhero Shield Icon */}
            <svg width="22" height="16" viewBox="0 0 42 30" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                fillRule="evenodd" 
                clipRule="evenodd" 
                d="M0.105957 10.1933L11.0668 0.294678H30.5399L41.5008 10.1933L20.8617 29.6529L0.105957 10.1933ZM12.2912 3.33174H18.2381L30.948 15.8737L20.8034 25.4348L4.65355 10.2495L12.2912 3.33174Z" 
                fill="white"
              />
            </svg>
          </div>
          <span className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Superhero</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const itemColors = themeColors[item.theme];
            const active = isParentActive(item);
            const expanded = expandedItems.has(item.id);

            return (
              <li key={item.id}>
                <button
                  id={`nav-${item.id}`}
                  type="button"
                  onClick={() => handleNavClick(item)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                    text-left transition-all duration-200
                    ${active 
                      ? "font-semibold" 
                      : `font-medium ${isDark ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}`
                    }
                  `}
                  style={{
                    backgroundColor: active ? itemColors.hover : undefined,
                    color: active ? itemColors.active : undefined,
                  }}
                >
                  <span 
                    className="flex-shrink-0"
                    style={{ color: active ? itemColors.active : isDark ? "#94A3B8" : "#6B7280" }}
                  >
                    {item.icon}
                  </span>
                  <span className="flex-1 text-sm">{item.label}</span>
                  {item.children && (
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      style={{ color: active ? itemColors.active : isDark ? "#64748B" : "#9CA3AF" }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>

                {/* Sub-items */}
                {item.children && expanded && (
                  <ul className="mt-1 ml-8 space-y-0.5">
                    {item.children.map((child) => {
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
                            className={`
                              block px-3 py-2 rounded-lg text-sm no-underline
                              transition-all duration-200
                              ${childActive 
                                ? "font-medium" 
                                : isDark 
                                  ? "text-slate-500 hover:text-white hover:bg-slate-800" 
                                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                              }
                            `}
                            style={{
                              color: childActive ? itemColors.active : undefined,
                              backgroundColor: childActive ? itemColors.hover : undefined,
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
      </nav>

      {/* AI Assistant Button */}
      <div className={`px-3 py-3 border-t ${isDark ? "border-slate-700" : "border-gray-200"}`}>
        <a
          href="https://quali.chat"
          target="_blank"
          rel="noopener noreferrer"
          className="
            relative flex items-center gap-3 px-4 py-3.5 rounded-xl
            transition-all duration-300 ease-out
            no-underline no-gradient-text overflow-hidden
            group
          "
          style={{
            background: isDark 
              ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(236, 72, 153, 0.2) 50%, rgba(6, 182, 212, 0.15) 100%)'
              : 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(236, 72, 153, 0.12) 50%, rgba(6, 182, 212, 0.1) 100%)',
            border: isDark ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid rgba(139, 92, 246, 0.3)',
            boxShadow: isDark 
              ? '0 4px 20px rgba(139, 92, 246, 0.15), inset 0 1px 0 rgba(255,255,255,0.1)'
              : '0 4px 20px rgba(139, 92, 246, 0.1), inset 0 1px 0 rgba(255,255,255,0.5)',
          }}
        >
          {/* Animated gradient overlay */}
          <div 
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(236, 72, 153, 0.25) 50%, rgba(6, 182, 212, 0.2) 100%)',
            }}
          />
          {/* Sparkle icon */}
          <div className="relative z-10 w-9 h-9 rounded-lg flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
              boxShadow: '0 2px 8px rgba(139, 92, 246, 0.4)',
            }}
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div className="relative z-10 flex-1">
            <span className={`text-sm font-semibold block ${isDark ? 'text-white' : 'text-gray-900'}`}>AI Assistant</span>
            <span className={`text-xs ${isDark ? 'text-violet-300' : 'text-violet-600'}`}>Powered by QualiChat</span>
          </div>
          <svg className={`relative z-10 w-4 h-4 ${isDark ? 'text-violet-400' : 'text-violet-500'} group-hover:translate-x-0.5 transition-transform`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>

      {/* Start Tour Button - only show if user has already completed tour */}
      {hasSeenOnboarding && (
        <div className={`px-3 pb-3`}>
          <button
            type="button"
            onClick={() => {
              resetOnboarding();
              startOnboarding();
              setMobileOpen(false);
            }}
            className={`
              w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg
              transition-all duration-200
              text-xs font-medium
              ${isDark 
                ? "text-slate-500 hover:text-slate-300 hover:bg-slate-800" 
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              }
            `}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Take a Tour</span>
          </button>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className={`
          lg:hidden fixed top-3 left-3 z-[1001] p-2 rounded-lg shadow-md
          ${isDark 
            ? "bg-slate-800 border border-slate-700" 
            : "bg-white border border-gray-200"
          }
        `}
        aria-label="Open menu"
      >
        <svg className={`w-6 h-6 ${isDark ? "text-slate-300" : "text-gray-700"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Desktop Sidebar */}
      <aside
        className={`
          hidden lg:flex lg:flex-col
          fixed top-0 left-0 bottom-0
          w-[240px] 
          z-[100]
          shadow-sm
          transition-colors duration-300
          ${isDark 
            ? "bg-slate-900 border-r border-slate-700" 
            : "bg-white border-r border-gray-200"
          }
        `}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-[1000]"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`
          lg:hidden fixed top-0 left-0 bottom-0
          w-[280px] 
          z-[1001]
          transform transition-transform duration-300 ease-in-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          flex flex-col
          shadow-xl
          ${isDark 
            ? "bg-slate-900 border-r border-slate-700" 
            : "bg-white border-r border-gray-200"
          }
        `}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className={`absolute top-4 right-4 p-2 rounded-lg ${isDark ? "hover:bg-slate-800" : "hover:bg-gray-100"}`}
          aria-label="Close menu"
        >
          <svg className={`w-5 h-5 ${isDark ? "text-slate-400" : "text-gray-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {sidebarContent}
      </aside>
    </>
  );
}
