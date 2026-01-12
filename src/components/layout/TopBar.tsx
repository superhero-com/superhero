import React from "react";
import Breadcrumbs from "./Breadcrumbs";
import UserProfileChip from "./UserProfileChip";
import { useTheme } from "@/contexts/ThemeContext";

/**
 * TopBar - Swiss Minimal Design
 * - Clean, no blur effects
 * - Simple border
 * - Typography-focused
 */

export default function TopBar() {
  const { isDark } = useTheme();
  
  const bgColor = isDark ? '#09090B' : '#FFFFFF';
  const borderColor = isDark ? '#27272A' : '#E4E4E7';

  return (
    <header
      className="sticky top-0 z-50 h-14 px-4 lg:px-6 flex items-center justify-between gap-4 transition-colors"
      style={{
        background: bgColor,
        borderBottom: `1px solid ${borderColor}`,
      }}
    >
      {/* Left: Breadcrumbs */}
      <div className="flex-1 min-w-0 pl-12 lg:pl-0">
        <Breadcrumbs />
      </div>

      {/* Right: User Profile only (when connected) */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <UserProfileChip showOnlyWhenConnected />
      </div>
    </header>
  );
}
