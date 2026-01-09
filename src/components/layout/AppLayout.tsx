import React, { createContext, useContext, useMemo } from "react";
import { useLocation, Outlet } from "react-router-dom";
import LeftSidebar from "./LeftSidebar";
import TopBar from "./TopBar";
import OnboardingTour from "@/components/onboarding/OnboardingTour";
import SocialFeedPanel from "@/components/SocialFeedPanel";
import { useTheme } from "@/contexts/ThemeContext";

// Section theme context
export type SectionTheme = "topics" | "social" | "defi" | "default";

interface SectionColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  gradient: string;
  border: string;
  bgGradient: string;
  cardBg: string;
  sidebarBg: string;
  iconBg: string;
  textPrimary: string;
  textSecondary: string;
}

interface SectionThemeContextValue {
  theme: SectionTheme;
  colors: SectionColors;
}

// Light mode themes
const lightThemes: Record<SectionTheme, SectionColors> = {
  topics: {
    primary: "#06B6D4",
    primaryLight: "#67E8F9",
    primaryDark: "#0891B2",
    gradient: "linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)",
    border: "rgba(6, 182, 212, 0.3)",
    bgGradient: "linear-gradient(180deg, #f0fdfa 0%, #ecfeff 50%, #f8fafc 100%)",
    cardBg: "rgba(255, 255, 255, 0.9)",
    sidebarBg: "#ffffff",
    iconBg: "#06B6D4",
    textPrimary: "#111827",
    textSecondary: "#6B7280",
  },
  social: {
    primary: "#8B5CF6",
    primaryLight: "#C4B5FD",
    primaryDark: "#DB2777",
    gradient: "linear-gradient(135deg, #8B5CF6 0%, #DB2777 100%)",
    border: "rgba(139, 92, 246, 0.2)",
    bgGradient: "linear-gradient(180deg, #faf5ff 0%, #fdf2f8 50%, #f8fafc 100%)",
    cardBg: "rgba(255, 255, 255, 0.9)",
    sidebarBg: "#ffffff",
    iconBg: "#8B5CF6",
    textPrimary: "#111827",
    textSecondary: "#6B7280",
  },
  defi: {
    primary: "#10B981",
    primaryLight: "#34D399",
    primaryDark: "#059669",
    gradient: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
    border: "rgba(16, 185, 129, 0.2)",
    bgGradient: "linear-gradient(180deg, #ecfdf5 0%, #d1fae5 50%, #f8fafc 100%)",
    cardBg: "rgba(255, 255, 255, 0.9)",
    sidebarBg: "#ffffff",
    iconBg: "#10B981",
    textPrimary: "#111827",
    textSecondary: "#6B7280",
  },
  default: {
    primary: "#06B6D4",
    primaryLight: "#67E8F9",
    primaryDark: "#0891B2",
    gradient: "linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)",
    border: "rgba(6, 182, 212, 0.3)",
    bgGradient: "linear-gradient(180deg, #f0fdfa 0%, #ecfeff 50%, #f8fafc 100%)",
    cardBg: "rgba(255, 255, 255, 0.9)",
    sidebarBg: "#ffffff",
    iconBg: "#06B6D4",
    textPrimary: "#111827",
    textSecondary: "#6B7280",
  },
};

// Dark mode themes
const darkThemes: Record<SectionTheme, SectionColors> = {
  topics: {
    primary: "#22D3EE",
    primaryLight: "#67E8F9",
    primaryDark: "#06B6D4",
    gradient: "linear-gradient(135deg, #22D3EE 0%, #06B6D4 100%)",
    border: "rgba(34, 211, 238, 0.3)",
    bgGradient: "linear-gradient(180deg, #0f172a 0%, #0c1322 50%, #020617 100%)",
    cardBg: "rgba(30, 41, 59, 0.8)",
    sidebarBg: "#0f172a",
    iconBg: "#22D3EE",
    textPrimary: "#F8FAFC",
    textSecondary: "#94A3B8",
  },
  social: {
    primary: "#A78BFA",
    primaryLight: "#C4B5FD",
    primaryDark: "#F472B6",
    gradient: "linear-gradient(135deg, #A78BFA 0%, #F472B6 100%)",
    border: "rgba(167, 139, 250, 0.3)",
    bgGradient: "linear-gradient(180deg, #1a0f1f 0%, #150a18 50%, #020617 100%)",
    cardBg: "rgba(30, 41, 59, 0.8)",
    sidebarBg: "#0f172a",
    iconBg: "#A78BFA",
    textPrimary: "#F8FAFC",
    textSecondary: "#94A3B8",
  },
  defi: {
    primary: "#34D399",
    primaryLight: "#6EE7B7",
    primaryDark: "#10B981",
    gradient: "linear-gradient(135deg, #34D399 0%, #10B981 100%)",
    border: "rgba(52, 211, 153, 0.3)",
    bgGradient: "linear-gradient(180deg, #0a1f17 0%, #071510 50%, #020617 100%)",
    cardBg: "rgba(30, 41, 59, 0.8)",
    sidebarBg: "#0f172a",
    iconBg: "#34D399",
    textPrimary: "#F8FAFC",
    textSecondary: "#94A3B8",
  },
  default: {
    primary: "#22D3EE",
    primaryLight: "#67E8F9",
    primaryDark: "#06B6D4",
    gradient: "linear-gradient(135deg, #22D3EE 0%, #06B6D4 100%)",
    border: "rgba(34, 211, 238, 0.3)",
    bgGradient: "linear-gradient(180deg, #0f172a 0%, #0c1322 50%, #020617 100%)",
    cardBg: "rgba(30, 41, 59, 0.8)",
    sidebarBg: "#0f172a",
    iconBg: "#22D3EE",
    textPrimary: "#F8FAFC",
    textSecondary: "#94A3B8",
  },
};

const SectionThemeContext = createContext<SectionThemeContextValue>({
  theme: "default",
  colors: lightThemes.default,
});

export const useSectionTheme = () => useContext(SectionThemeContext);

function getSectionFromPath(pathname: string): SectionTheme {
  if (pathname.startsWith("/trends") || pathname === "/") {
    return "topics";
  }
  if (pathname.startsWith("/social") || pathname.startsWith("/post") || pathname.startsWith("/users")) {
    return "social";
  }
  if (pathname.startsWith("/defi")) {
    return "defi";
  }
  return "default";
}

interface AppLayoutProps {
  children?: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const { isDark } = useTheme();
  const currentSection = getSectionFromPath(location.pathname);
  
  const themeValue = useMemo<SectionThemeContextValue>(
    () => ({
      theme: currentSection,
      colors: isDark ? darkThemes[currentSection] : lightThemes[currentSection],
    }),
    [currentSection, isDark]
  );

  return (
    <SectionThemeContext.Provider value={themeValue}>
      <div 
        className={`
          app-layout min-h-screen flex transition-colors duration-500
          ${isDark ? "dark" : ""}
        `}
        style={{
          "--section-primary": themeValue.colors.primary,
          "--section-primary-light": themeValue.colors.primaryLight,
          "--section-primary-dark": themeValue.colors.primaryDark,
          "--section-gradient": themeValue.colors.gradient,
          "--section-border": themeValue.colors.border,
          "--section-bg-gradient": themeValue.colors.bgGradient,
          "--section-card-bg": themeValue.colors.cardBg,
          "--section-icon-bg": themeValue.colors.iconBg,
          "--section-text-primary": themeValue.colors.textPrimary,
          "--section-text-secondary": themeValue.colors.textSecondary,
          background: themeValue.colors.bgGradient,
          color: themeValue.colors.textPrimary,
        } as React.CSSProperties}
      >
        {/* Left Sidebar - fixed on desktop */}
        <LeftSidebar />
        
        {/* Main content area */}
        <div className="flex-1 flex flex-col min-h-screen lg:ml-[240px]">
          {/* Top Bar */}
          <TopBar />
          
          {/* Main content */}
          <main className="flex-1 overflow-auto">
            <div className="max-w-[1400px] mx-auto px-4 py-6 lg:px-6">
              {children ?? <Outlet />}
            </div>
          </main>
        </div>
        
        {/* Social Feed Panel - Floating notification button */}
        <SocialFeedPanel />
        
        {/* Onboarding Tour */}
        <OnboardingTour />
      </div>
    </SectionThemeContext.Provider>
  );
}
