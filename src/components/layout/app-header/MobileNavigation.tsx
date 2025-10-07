import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import SearchInput from '../../SearchInput';
import { HeaderLogo, IconSearch, IconMobileMenu } from '../../../icons';
import HeaderWalletButton from './HeaderWalletButton';

export default function MobileNavigation() {
  const [showOverlay, setShowOverlay] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const t = (document.documentElement.dataset.theme as 'light' | 'dark' | undefined) || 'dark';
    return t;
  });
  const { pathname } = useLocation();
  const isOnFeed = pathname === '/';

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
          <div className="flex-grow" />
          

          <button
            className="bg-transparent border-none text-[var(--standard-font-color)] flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg transition-all duration-200 text-lg cursor-pointer hover:bg-white/10 focus:bg-white/10 active:bg-white/20 active:scale-95"
            onClick={() => {
              const next = theme === 'dark' ? 'light' : 'dark';
              document.documentElement.dataset.theme = next;
              try { localStorage.setItem('theme', next); } catch { }
              setTheme(next);
            }}
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
          )}

          <button
            className="bg-transparent border-none text-[var(--standard-font-color)] flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg transition-all duration-200 text-lg cursor-pointer hover:bg-white/10 focus:bg-white/10 active:bg-white/20 active:scale-95"
            onClick={handleMenuToggle}
            aria-label="Open Menu"
          >
            <IconMobileMenu />
          </button>
          

        </div>
      )}

      {/* Navigation Overlay */}
      {showOverlay && (
        <div className="fixed inset-0 bg-black/80 flex items-start justify-end z-[1000] sm:items-start sm:justify-center" onClick={() => setShowOverlay(false)}>
          <div className="z-[1001] text-[var(--light-font-color)] relative w-full max-w-[320px] h-screen bg-[var(--background-color)] flex flex-col overflow-y-auto sm:max-w-full sm:w-full" onClick={(e) => e.stopPropagation()}>
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
              <Link to="/" onClick={handleNavigationClick} className="flex items-center py-4 px-5 bg-white/5 rounded-xl text-[var(--standard-font-color)] no-underline font-medium transition-all duration-200 min-h-[56px] gap-4 hover:bg-white/10 hover:translate-x-1 active:bg-white/15 active:translate-x-0.5 active:scale-[0.98] sm:py-3.5 sm:px-4 sm:min-h-[52px] sm:gap-3">
                <span className="text-xl w-6 text-center sm:text-lg sm:w-5">🏠</span>
                <span className="text-base sm:text-[15px]">Feed</span>
              </Link>
              <Link to="/trending" onClick={handleNavigationClick} className="flex items-center py-4 px-5 bg-white/5 rounded-xl text-[var(--standard-font-color)] no-underline font-medium transition-all duration-200 min-h-[56px] gap-4 hover:bg-white/10 hover:translate-x-1 active:bg-white/15 active:translate-x-0.5 active:scale-[0.98] sm:py-3.5 sm:px-4 sm:min-h-[52px] sm:gap-3">
                <span className="text-xl w-6 text-center sm:text-lg sm:w-5">📈</span>
                <span className="text-base sm:text-[15px]">Trends</span>
              </Link>
              <Link to="/trending/invite" onClick={handleNavigationClick} className="flex items-center py-4 px-5 bg-white/5 rounded-xl text-[var(--standard-font-color)] no-underline font-medium transition-all duration-200 min-h-[56px] gap-4 hover:bg-white/10 hover:translate-x-1 active:bg-white/15 active:translate-x-0.5 active:scale-[0.98] sm:py-3.5 sm:px-4 sm:min-h-[52px] sm:gap-3">
                <span className="text-xl w-6 text-center sm:text-lg sm:w-5">🎁</span>
                <span className="text-base sm:text-[15px]">Invite & Earn</span>
              </Link>
              <Link to="/voting" onClick={handleNavigationClick} className="flex items-center py-4 px-5 bg-white/5 rounded-xl text-[var(--standard-font-color)] no-underline font-medium transition-all duration-200 min-h-[56px] gap-4 hover:bg-white/10 hover:translate-x-1 active:bg-white/15 active:translate-x-0.5 active:scale-[0.98] sm:py-3.5 sm:px-4 sm:min-h-[52px] sm:gap-3">
                <span className="text-xl w-6 text-center sm:text-lg sm:w-5">🗳️</span>
                <span className="text-base sm:text-[15px]">Governance & Voting</span>
              </Link>
              <Link to="/landing" onClick={handleNavigationClick} className="flex items-center py-4 px-5 bg-white/5 rounded-xl text-[var(--standard-font-color)] no-underline font-medium transition-all duration-200 min-h-[56px] gap-4 hover:bg-white/10 hover:translate-x-1 active:bg-white/15 active:translate-x-0.5 active:scale-[0.98] sm:py-3.5 sm:px-4 sm:min-h-[52px] sm:gap-3">
                <span className="text-xl w-6 text-center sm:text-lg sm:w-5">ℹ️</span>
                <span className="text-base sm:text-[15px]">Info</span>
              </Link>
              <a
                href="https://github.com/aeternity/superhero-ui"
                target="_blank"
                rel="noreferrer"
                className="flex items-center py-4 px-5 bg-white/5 rounded-xl text-[var(--standard-font-color)] no-underline font-medium transition-all duration-200 min-h-[56px] gap-4 hover:bg-white/10 hover:translate-x-1 active:bg-white/15 active:translate-x-0.5 active:scale-[0.98] sm:py-3.5 sm:px-4 sm:min-h-[52px] sm:gap-3"
                onClick={handleNavigationClick}
              >
                <span className="text-xl w-6 text-center sm:text-lg sm:w-5">🐙</span>
                <span className="text-base sm:text-[15px]">GitHub</span>
              </a>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}


