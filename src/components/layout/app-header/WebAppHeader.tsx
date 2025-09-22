import React, { useCallback, useEffect, useState } from 'react';
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

  useEffect(() => {
    // force theme to be dark
    document.documentElement.dataset.theme = 'dark';
    localStorage.setItem('theme', 'dark');
    setTheme('dark');
  }, []);

  const isActiveRoute = (path: string) => {
    if (path === '/') return pathname === '/';
    if (path === '/trendminer/daos') return isDaoPath;
    return pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-[1000] hidden md:block border-b" style={{ 
      backgroundColor: 'var(--topnav-background)', 
      backdropFilter: 'blur(10px)',
      borderBottomColor: 'rgba(255, 255, 255, 0.1)'
    }}>
      <div className="flex items-center gap-6 px-6 h-16 max-w-[min(1648px,100%)] mx-auto md:px-5 md:gap-5">
        <Link to="/" className="flex items-center no-underline" style={{ color: 'var(--standard-font-color)' }} aria-label="Superhero Home">
          <HeaderLogo className="h-8 w-auto" />
        </Link>

        <nav className="flex-1 items-center gap-6 flex-grow md:gap-5">
          {navigationItems.map(item => (
            item.isExternal ? (
              <a
                key={item.id}
                href={item.path}
                target="_blank"
                rel="noreferrer"
                className={`no-underline font-medium px-3 py-2 rounded-lg transition-all duration-200 relative ${
                  isActiveRoute(item.path) 
                    ? 'after:content-[""] after:absolute after:-bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-5 after:h-0.5 after:rounded-sm'
                    : ''
                }`}
                style={{
                  color: isActiveRoute(item.path) ? 'var(--custom-links-color)' : 'var(--light-font-color)',
                  backgroundColor: isActiveRoute(item.path) ? 'rgba(0,255,157,0.1)' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute(item.path)) {
                    e.currentTarget.style.color = 'var(--standard-font-color)';
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute(item.path)) {
                    e.currentTarget.style.color = 'var(--light-font-color)';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {item.label}
                {isActiveRoute(item.path) && (
                  <span 
                    className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-sm"
                    style={{ backgroundColor: 'var(--custom-links-color)' }}
                  />
                )}
              </a>
            ) : (
              <Link
                key={item.id}
                to={item.path}
                className={`no-underline font-medium px-3 py-2 rounded-lg transition-all duration-200 relative`}
                style={{
                  color: isActiveRoute(item.path) ? 'var(--custom-links-color)' : 'var(--light-font-color)',
                  backgroundColor: isActiveRoute(item.path) ? 'rgba(0,255,157,0.1)' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActiveRoute(item.path)) {
                    e.currentTarget.style.color = 'var(--standard-font-color)';
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActiveRoute(item.path)) {
                    e.currentTarget.style.color = 'var(--light-font-color)';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {item.label}
                {isActiveRoute(item.path) && (
                  <span 
                    className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-sm"
                    style={{ backgroundColor: 'var(--custom-links-color)' }}
                  />
                )}
              </Link>
            )
          ))}
        </nav>

        <div className="flex-1 flex justify-end items-end gap-4">
          <HeaderWalletButton />
        </div>
      </div>
    </header>
  );
}
