import React from "react";
import Breadcrumbs from "./Breadcrumbs";
import UserProfileChip from "./UserProfileChip";
import ThemeSwitcher from "./ThemeSwitcher";

export default function TopBar() {
  return (
    <header
      className="
        sticky top-0 z-50
        h-14 px-4 lg:px-6
        flex items-center justify-between gap-4
        bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl
        border-b border-gray-200 dark:border-slate-700
        transition-colors duration-300
      "
    >
      {/* Left: Breadcrumbs */}
      <div className="flex-1 min-w-0 pl-12 lg:pl-0">
        <Breadcrumbs />
      </div>

      {/* Right: Theme Switcher + User Profile */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <ThemeSwitcher />
        <UserProfileChip />
      </div>
    </header>
  );
}
