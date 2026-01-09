import React from "react";
import { useTheme } from "@/contexts/ThemeContext";

// Sun icon for light mode
const SunIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
);

// Moon icon for dark mode
const MoonIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
    />
  </svg>
);

interface ThemeSwitcherProps {
  className?: string;
}

export default function ThemeSwitcher({ className = "" }: ThemeSwitcherProps) {
  const { mode, toggleMode, isDark } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleMode}
      className={`
        relative flex items-center justify-center
        w-10 h-10 rounded-xl
        transition-all duration-300 ease-out
        hover:scale-105 active:scale-95
        ${isDark 
          ? "bg-slate-700 text-amber-400 hover:bg-slate-600" 
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }
        ${className}
      `}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      <span
        className={`
          absolute transition-all duration-300
          ${isDark ? "opacity-0 rotate-90 scale-0" : "opacity-100 rotate-0 scale-100"}
        `}
      >
        <SunIcon />
      </span>
      <span
        className={`
          absolute transition-all duration-300
          ${isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-0"}
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

  return (
    <button
      type="button"
      onClick={toggleMode}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg
        transition-all duration-200
        ${isDark 
          ? "bg-slate-700/50 text-slate-300 hover:bg-slate-600/50" 
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
        }
        ${className}
      `}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      {isDark ? <MoonIcon /> : <SunIcon />}
      <span className="text-sm font-medium">
        {isDark ? "Dark" : "Light"}
      </span>
    </button>
  );
}

