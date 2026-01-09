import React, { createContext, useContext, useMemo } from "react";
import { useLocation, Outlet } from "react-router-dom";
import LeftSidebar from "./LeftSidebar";
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
  bgTint: string; // Subtle background tint
  cardBg: string;
  sidebarBg: string;
  iconBg: string;
  textPrimary: string;
  textSecondary: string;
  accentName: string; // Human-readable name
}

interface SectionThemeContextValue {
  theme: SectionTheme;
  colors: SectionColors;
}

// Swiss Minimal Light mode themes - Clean, typography-focused
// Each section has a distinct accent color but maintains Swiss minimalism
const lightThemes: Record<SectionTheme, SectionColors> = {
  topics: {
    primary: "#FF0000", // Swiss red
    primaryLight: "#FF3333",
    primaryDark: "#CC0000",
    gradient: "#FF0000",
    border: "#E4E4E7",
    bgGradient: "#FAFAFA",
    bgTint: "rgba(255, 0, 0, 0.015)", // Very subtle red tint
    cardBg: "#FFFFFF",
    sidebarBg: "#FFFFFF",
    iconBg: "#000000",
    textPrimary: "#000000",
    textSecondary: "#71717A",
    accentName: "Red",
  },
  social: {
    primary: "#FF0000",
    primaryLight: "#FF3333",
    primaryDark: "#CC0000",
    gradient: "#FF0000",
    border: "#E4E4E7",
    bgGradient: "#FAFAFA",
    bgTint: "rgba(255, 0, 0, 0.015)",
    cardBg: "#FFFFFF",
    sidebarBg: "#FFFFFF",
    iconBg: "#000000",
    textPrimary: "#000000",
    textSecondary: "#71717A",
    accentName: "Red",
  },
  defi: {
    primary: "#22C55E", // Green for DeFi
    primaryLight: "#4ADE80",
    primaryDark: "#16A34A",
    gradient: "#22C55E",
    border: "#D4E7DC", // Subtle green-tinted border
    bgGradient: "#F8FBF9", // Very subtle green background
    bgTint: "rgba(34, 197, 94, 0.03)", // Subtle green tint
    cardBg: "#FFFFFF",
    sidebarBg: "#FFFFFF",
    iconBg: "#000000",
    textPrimary: "#000000",
    textSecondary: "#71717A",
    accentName: "Green",
  },
  default: {
    primary: "#FF0000",
    primaryLight: "#FF3333",
    primaryDark: "#CC0000",
    gradient: "#FF0000",
    border: "#E4E4E7",
    bgGradient: "#FAFAFA",
    bgTint: "transparent",
    cardBg: "#FFFFFF",
    sidebarBg: "#FFFFFF",
    iconBg: "#000000",
    textPrimary: "#000000",
    textSecondary: "#71717A",
    accentName: "Red",
  },
};

// Swiss Minimal Dark mode themes
const darkThemes: Record<SectionTheme, SectionColors> = {
  topics: {
    primary: "#FF0000", // Swiss red
    primaryLight: "#FF3333",
    primaryDark: "#CC0000",
    gradient: "#FF0000",
    border: "#27272A",
    bgGradient: "#09090B",
    bgTint: "rgba(255, 0, 0, 0.02)", // Very subtle red tint in dark
    cardBg: "#18181B",
    sidebarBg: "#09090B",
    iconBg: "#FFFFFF",
    textPrimary: "#FFFFFF",
    textSecondary: "#A1A1AA",
    accentName: "Red",
  },
  social: {
    primary: "#FF0000",
    primaryLight: "#FF3333",
    primaryDark: "#CC0000",
    gradient: "#FF0000",
    border: "#27272A",
    bgGradient: "#09090B",
    bgTint: "rgba(255, 0, 0, 0.02)",
    cardBg: "#18181B",
    sidebarBg: "#09090B",
    iconBg: "#FFFFFF",
    textPrimary: "#FFFFFF",
    textSecondary: "#A1A1AA",
    accentName: "Red",
  },
  defi: {
    primary: "#22C55E",
    primaryLight: "#4ADE80",
    primaryDark: "#16A34A",
    gradient: "#22C55E",
    border: "#1E3A2F", // Dark green-tinted border
    bgGradient: "#080C0A", // Very dark with green tint
    bgTint: "rgba(34, 197, 94, 0.03)", // Subtle green tint
    cardBg: "#111612", // Slight green tint in cards
    sidebarBg: "#09090B",
    iconBg: "#FFFFFF",
    textPrimary: "#FFFFFF",
    textSecondary: "#A1A1AA",
    accentName: "Green",
  },
  default: {
    primary: "#FF0000",
    primaryLight: "#FF3333",
    primaryDark: "#CC0000",
    gradient: "#FF0000",
    border: "#27272A",
    bgGradient: "#09090B",
    bgTint: "transparent",
    cardBg: "#18181B",
    sidebarBg: "#09090B",
    iconBg: "#FFFFFF",
    textPrimary: "#FFFFFF",
    textSecondary: "#A1A1AA",
    accentName: "Red",
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
      {/* Import Inter font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        .app-layout * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
        }
        
        /* Smooth section transition */
        .app-layout {
          transition: background-color 0.4s ease, border-color 0.3s ease;
        }
      `}</style>
      
      <div 
        className={`
          app-layout min-h-screen flex transition-all duration-500
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
          background: `linear-gradient(to bottom, ${themeValue.colors.bgTint}, ${themeValue.colors.bgGradient})`,
          color: themeValue.colors.textPrimary,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        } as React.CSSProperties}
      >
        {/* Left Sidebar - fixed on desktop */}
        <LeftSidebar />
        
        {/* Main content area */}
        <div className="flex-1 flex flex-col min-h-screen lg:ml-[280px]">
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
