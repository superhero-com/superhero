import React, { useCallback, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HeaderLogo } from '../../../icons';
import HeaderWalletButton from './HeaderWalletButton';
import { navigationItems } from './navigationItems';


export default function WebAppHeader() {
  const { pathname } = useLocation();
  const isDaoPath = pathname.startsWith('/trendminer/dao') || pathname.startsWith('/trendminer/daos');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const t = (document.documentElement.dataset.theme as 'light' | 'dark' | undefined) || 'dark';
    return t;
  });

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch { }
    setTheme(next);
  }, [theme]);

  const isActiveRoute = (path: string) => {
    if (path === '/') return pathname === '/';
    if (path === '/trendminer/daos') return isDaoPath;
    return pathname.startsWith(path);
  };

  return (
    <header className="web-app-header">
      <div className="container">
        <Link to="/" className="brand" aria-label="Superhero Home">
          <HeaderLogo className="icon logo" />
        </Link>

        <nav className="nav-links">
          {navigationItems.map(item => (
            item.isExternal ? (
              <a
                key={item.id}
                href={item.path}
                target="_blank"
                rel="noreferrer"
                className={isActiveRoute(item.path) ? 'active' : ''}
              >
                {item.label}
              </a>
            ) : (
              <Link
                key={item.id}
                to={item.path}
                className={isActiveRoute(item.path) ? 'active' : ''}
              >
                {item.label}
              </Link>
            )
          ))}
        </nav>

        <div className="header-actions">
          {/* <button 
            className="theme-toggle" 
            onClick={toggleTheme} 
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button> */}
          <HeaderWalletButton />
        </div>
      </div>
    </header>
  );
}
