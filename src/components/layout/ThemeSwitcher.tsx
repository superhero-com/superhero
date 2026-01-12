import React from "react";
import { useTheme } from "@/contexts/ThemeContext";

/**
 * ThemeSwitcher - Swiss Minimal Design
 * - Clean, no rounded corners
 * - Simple icon toggle
 * - Minimal styling
 */

// Sun icon for light mode
const SunIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
);

// Moon icon for dark mode
const MoonIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
    />
  </svg>
);

interface ThemeSwitcherProps {
  className?: string;
}

export default function ThemeSwitcher({ className = "" }: ThemeSwitcherProps) {
  const { toggleMode, isDark } = useTheme();

  // Swiss colors
  const textPrimary = isDark ? '#FFFFFF' : '#000000';
  const textSecondary = isDark ? '#71717A' : '#71717A';
  const borderColor = isDark ? '#27272A' : '#E4E4E7';
  const hoverBg = isDark ? '#18181B' : '#F4F4F5';

  return (
    <button
      type="button"
      onClick={toggleMode}
      className={`
        relative flex items-center justify-center
        w-9 h-9
        transition-colors
        ${className}
      `}
      style={{
        border: `1px solid ${borderColor}`,
        background: 'transparent',
        color: textSecondary,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = hoverBg;
        e.currentTarget.style.color = textPrimary;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = textSecondary;
      }}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      <span
        className={`
          absolute transition-all duration-200
          ${isDark ? "opacity-0 scale-0" : "opacity-100 scale-100"}
        `}
      >
        <SunIcon />
      </span>
      <span
        className={`
          absolute transition-all duration-200
          ${isDark ? "opacity-100 scale-100" : "opacity-0 scale-0"}
        `}
      >
        <MoonIcon />
      </span>
    </button>
  );
}

// Compact version for mobile or tight spaces
export function ThemeSwitcherCompact({ className = "" }: ThemeSwitcherProps) {
  const { toggleMode, isDark } = useTheme();

  const textPrimary = isDark ? '#FFFFFF' : '#000000';
  const textSecondary = isDark ? '#71717A' : '#71717A';
  const borderColor = isDark ? '#27272A' : '#E4E4E7';

  return (
    <button
      type="button"
      onClick={toggleMode}
      className={`
        flex items-center gap-2 px-3 py-2
        transition-colors
        ${className}
      `}
      style={{
        border: `1px solid ${borderColor}`,
        color: textSecondary,
      }}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      {isDark ? <MoonIcon /> : <SunIcon />}
      <span 
        className="text-xs font-medium uppercase tracking-wide"
        style={{ color: textPrimary }}
      >
        {isDark ? "Dark" : "Light"}
      </span>
    </button>
  );
}
