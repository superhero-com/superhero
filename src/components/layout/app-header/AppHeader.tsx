import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './AppHeader.scss';
import { HeaderLogo } from '../../../icons';
import HeaderWalletButton from './HeaderWalletButton';

export default function AppHeader() {
  const { pathname } = useLocation();
  const isDaoPath = pathname.startsWith('/trendminer/dao') || pathname.startsWith('/trendminer/daos');
  const [theme, setTheme] = React.useState<'light' | 'dark'>(() => {
    const t = (document.documentElement.dataset.theme as 'light' | 'dark' | undefined) || 'dark';
    return t;
  });

  const toggleTheme = React.useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch {}
    setTheme(next);
  }, [theme]);
  return (
    <header className="app-header">
      <div className="container">
        <Link to="/" className="brand" aria-label="Superhero Home">
          <HeaderLogo className="icon logo" />
        </Link>
        <nav className="links">
          <Link to="/" className={pathname === '/' ? 'active' : ''}>Home</Link>
          <Link to="/trending" className={pathname === '/trending' ? 'active' : ''}>Trends</Link>
          {/* TrendCloud moved to footer */}
          <Link to="/dex" className={pathname === '/dex' ? 'active' : ''}>DEX</Link>
          <Link to="/trendminer/invite" className={pathname === '/trendminer/invite' ? 'active' : ''}>Invite & Earn</Link>
          <Link to="/voting" className={pathname === '/voting' ? 'active' : ''}>Governance & Voting</Link>
          <Link to="/trendminer/daos" className={isDaoPath ? 'active' : ''}>DAOs</Link>

          <div className="dropdown">
            <button
              className={`dropdown-toggle${(pathname === '/landing' || pathname === '/faq') ? ' active' : ''}`}
              aria-haspopup="true"
              aria-expanded={(pathname === '/landing' || pathname === '/faq') ? 'true' : 'false'}
            >
              More
            </button>
            <div className="dropdown-menu" role="menu">
              <Link to="/landing" className={pathname === '/landing' ? 'active' : ''} role="menuitem">Info</Link>
              <Link to="/faq" className={pathname === '/faq' ? 'active' : ''} role="menuitem">FAQ</Link>
            </div>
          </div>

        </nav>
        <div className="header-actions">
          <button className="link" onClick={toggleTheme} aria-label="Toggle theme">{theme === 'dark' ? 'Light' : 'Dark'}</button>
          <HeaderWalletButton />
        </div>
      </div>
    </header>
  );
}
