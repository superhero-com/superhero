import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './MobileNavigation.scss';
import SearchInput from '../SearchInput';
import { HeaderLogo, IconSearch, IconMobileMenu } from '../../icons';

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
    <div className="mobile-navigation-sticky">
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
          
          <button
            className="button-plain"
            onClick={() => {
              const next = theme === 'dark' ? 'light' : 'dark';
              document.documentElement.dataset.theme = next;
              try { localStorage.setItem('theme', next); } catch {}
              setTheme(next);
            }}
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
          )}
          
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
              <Link to="/" onClick={handleNavigationClick} className="nav-item">
                <span className="nav-icon">🏠</span>
                <span className="nav-text">Feed</span>
              </Link>
              <Link to="/trending" onClick={handleNavigationClick} className="nav-item">
                <span className="nav-icon">📈</span>
                <span className="nav-text">Trends</span>
              </Link>
              <Link to="/trendminer/invite" onClick={handleNavigationClick} className="nav-item">
                <span className="nav-icon">🎁</span>
                <span className="nav-text">Invite & Earn</span>
              </Link>
              <Link to="/voting" onClick={handleNavigationClick} className="nav-item">
                <span className="nav-icon">🗳️</span>
                <span className="nav-text">Governance & Voting</span>
              </Link>
              <Link to="/landing" onClick={handleNavigationClick} className="nav-item">
                <span className="nav-icon">ℹ️</span>
                <span className="nav-text">Info</span>
              </Link>
              <a 
                href="https://github.com/aeternity/superhero-ui" 
                target="_blank" 
                rel="noreferrer"
                className="nav-item"
                onClick={handleNavigationClick}
              >
                <span className="nav-icon">🐙</span>
                <span className="nav-text">GitHub</span>
              </a>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}


