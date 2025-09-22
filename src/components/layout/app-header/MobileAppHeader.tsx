import React, { useState, useCallback, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import SearchInput from '../../SearchInput';
import { HeaderLogo, IconSearch, IconMobileMenu } from '../../../icons';
import HeaderWalletButton from './HeaderWalletButton';
import { navigationItems } from './navigationItems';



export default function MobileAppHeader() {
  const [showOverlay, setShowOverlay] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const t = (document.documentElement.dataset.theme as 'light' | 'dark' | undefined) || 'dark';
    return t;
  });

  const { pathname } = useLocation();
  const isOnFeed = pathname === '/';

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch { }
    setTheme(next);
  }, [theme]);

  const handleSearchToggle = () => {
    setShowSearch(!showSearch);
    if (showOverlay) {
      setShowOverlay(false);
    }
  };

  const handleMenuToggle = () => {
    setShowOverlay(!showOverlay);
    if (showSearch) {
      setShowSearch(false);
    }
  };

  const handleNavigationClick = () => {
    setShowOverlay(false);
    setShowSearch(false);
  };

  // Close mobile overlays when route changes
  useEffect(() => {
    setShowOverlay(false);
    setShowSearch(false);
  }, [pathname]);

  // Close mobile overlays on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowOverlay(false);
        setShowSearch(false);
      }
    };

    if (showOverlay || showSearch) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showOverlay, showSearch]);

  return (
    <div className="z-[101] fixed top-0 left-0 right-0 w-full bg-[rgba(var(--background-color-rgb),0.95)] backdrop-blur-[20px] border-b border-white/10 shadow-[0_2px_20px_rgba(0,0,0,0.1)] md:hidden pt-[env(safe-area-inset-top)] h-[calc(var(--mobile-navigation-height)+env(safe-area-inset-top))]">
      {/* Search Mode */}
      {showSearch ? (
        <div className="px-3 flex items-center gap-3 w-full pt-[env(safe-area-inset-top)] h-[calc(var(--mobile-navigation-height)+env(safe-area-inset-top))]">
          <button
            className="bg-transparent border-none text-[var(--standard-font-color)] flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg transition-all duration-200 cursor-pointer text-xl font-bold hover:bg-white/10 focus:bg-white/10 active:bg-white/20 active:scale-95"
            onClick={() => setShowSearch(false)}
            aria-label="Back"
          >
            ←
          </button>
          <div className="flex-1">
            <SearchInput />
          </div>
        </div>
      ) : (
        /* Normal Navigation Mode */
        <div className="px-3 flex items-center gap-2 w-full pt-[env(safe-area-inset-top)] h-[calc(var(--mobile-navigation-height)+env(safe-area-inset-top))] sm:px-2 sm:gap-1.5">
          <Link to="/" className="text-[var(--standard-font-color)] flex items-center min-h-[44px] min-w-[44px]" aria-label="Superhero Home">
            <HeaderLogo className="h-7 w-auto" />
          </Link>
          <div className="flex-grow hidden md:block" />

          {/* <button
            className="bg-transparent border-none text-[var(--standard-font-color)] flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg transition-all duration-200 text-lg cursor-pointer hover:bg-white/10 focus:bg-white/10 active:bg-white/20 active:scale-95"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? '☀︎' : '☽'}
          </button>

          {isOnFeed && (
            <button
              className="bg-transparent border-none text-[var(--standard-font-color)] flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg transition-all duration-200 text-lg cursor-pointer hover:bg-white/10 focus:bg-white/10 active:bg-white/20 active:scale-95"
              onClick={handleSearchToggle}
              aria-label="Search"
            >
              <IconSearch />
            </button>
          )} */}
          <HeaderWalletButton className="flex-1" />
          <div className="flex-grow md:hidden" />

          <button
            className="flex-grow bg-transparent border-none text-[var(--standard-font-color)] flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg transition-all duration-200 text-lg cursor-pointer hover:bg-white/10 focus:bg-white/10 active:bg-white/20 active:scale-95"
            onClick={handleMenuToggle}
            aria-label="Open Menu"
          >
            <IconMobileMenu />
          </button>
        </div>
      )}

      {/* Navigation Overlay */}
      {showOverlay && (
        <div className="fixed inset-0 bg-black/80 flex items-start justify-end z-[1000] animate-[fadeIn_0.2s_ease-out] backdrop-blur-[4px] sm:items-start sm:justify-center" onClick={() => setShowOverlay(false)}>
          <div className="z-[1001] text-[var(--light-font-color)] relative w-full max-w-[320px] h-screen bg-[var(--background-color)] flex flex-col overflow-y-auto animate-[slideInRight_0.3s_ease-out] shadow-[-10px_0_30px_rgba(0,0,0,0.3)] sm:max-w-full sm:w-full sm:animate-[slideInUp_0.3s_ease-out] sm:shadow-[0_-10px_30px_rgba(0,0,0,0.3)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between py-5 px-6 pb-4 border-b border-white/10 sm:py-4 sm:px-5 sm:pb-3">
              <h2 className="m-0 text-xl font-semibold text-[var(--standard-font-color)] sm:text-lg">Menu</h2>
              <button
                className="bg-white/10 border-none text-[var(--standard-font-color)] w-11 h-11 rounded-full flex items-center justify-center text-lg cursor-pointer transition-all duration-200 hover:bg-white/20 focus:bg-white/20 active:scale-95 sm:w-10 sm:h-10 sm:text-base"
                onClick={() => setShowOverlay(false)}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <nav className="flex flex-col py-4 px-6 gap-2 flex-1 sm:py-3 sm:px-5 sm:gap-1.5">
              {navigationItems.map(item => (
                item.isExternal ? (
                  <a
                    key={item.id}
                    href={item.path}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center py-4 px-5 bg-white/5 rounded-xl text-[var(--standard-font-color)] no-underline font-medium transition-all duration-200 min-h-[56px] gap-4 relative hover:bg-white/10 hover:translate-x-1 focus:outline-none focus-visible:outline-2 focus-visible:outline-[var(--custom-links-color)] focus-visible:outline-offset-2 active:bg-white/15 active:translate-x-0.5 active:scale-[0.98] sm:py-3.5 sm:px-4 sm:min-h-[52px] sm:gap-3"
                    onClick={handleNavigationClick}
                  >
                    <span className="text-xl w-6 text-center sm:text-lg sm:w-5">{item.icon}</span>
                    <span className="text-base sm:text-[15px]">{item.label}</span>
                  </a>
                ) : (
                  <Link
                    key={item.id}
                    to={item.path}
                    onClick={handleNavigationClick}
                    className="flex items-center py-4 px-5 bg-white/5 rounded-xl text-[var(--standard-font-color)] no-underline font-medium transition-all duration-200 min-h-[56px] gap-4 relative hover:bg-white/10 hover:translate-x-1 focus:outline-none focus-visible:outline-2 focus-visible:outline-[var(--custom-links-color)] focus-visible:outline-offset-2 active:bg-white/15 active:translate-x-0.5 active:scale-[0.98] sm:py-3.5 sm:px-4 sm:min-h-[52px] sm:gap-3"
                  >
                    <span className="text-xl w-6 text-center sm:text-lg sm:w-5">{item.icon}</span>
                    <span className="text-base sm:text-[15px]">{item.label}</span>
                  </Link>
                )
              ))}
            </nav>

            <div className="py-4 px-6 border-t border-white/10 sm:py-3 sm:px-5">
              <HeaderWalletButton />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
