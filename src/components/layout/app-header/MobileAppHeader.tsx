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
    <div className="mobile-app-header-sticky">
      {/* Search Mode */}
      {showSearch ? (
        <div className="mobile-navigation mobile-search-mode">
          <button
            className="button-plain back-button"
            onClick={() => setShowSearch(false)}
            aria-label="Back"
          >
            ←
          </button>
          <div className="search-container">
            <SearchInput />
          </div>
        </div>
      ) : (
        /* Normal Navigation Mode */
        <div className="mobile-navigation">
          <Link to="/" className="logo" aria-label="Superhero Home">
            <HeaderLogo className="icon" />
          </Link>
          <div className="separator" />


          {/* <button
            className="button-plain theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? '☀︎' : '☽'}
          </button>

          {isOnFeed && (
            <button
              className="button-plain"
              onClick={handleSearchToggle}
              aria-label="Search"
            >
              <IconSearch />
            </button>
          )} */}
          <HeaderWalletButton />

          <button
            className="button-plain"
            onClick={handleMenuToggle}
            aria-label="Open Menu"
          >
            <IconMobileMenu />
          </button>
        </div>
      )}

      {/* Navigation Overlay */}
      {showOverlay && (
        <div className="modal overlay" onClick={() => setShowOverlay(false)}>
          <div className="mobile-navigation-overlay" onClick={(e) => e.stopPropagation()}>
            <div className="overlay-header">
              <h2 className="overlay-title">Menu</h2>
              <button
                className="close-button"
                onClick={() => setShowOverlay(false)}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <nav className="navigation">
              {navigationItems.map(item => (
                item.isExternal ? (
                  <a
                    key={item.id}
                    href={item.path}
                    target="_blank"
                    rel="noreferrer"
                    className="nav-item"
                    onClick={handleNavigationClick}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-text">{item.label}</span>
                  </a>
                ) : (
                  <Link
                    key={item.id}
                    to={item.path}
                    onClick={handleNavigationClick}
                    className="nav-item"
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-text">{item.label}</span>
                  </Link>
                )
              ))}
            </nav>

            <div className="overlay-footer">
              <HeaderWalletButton />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
