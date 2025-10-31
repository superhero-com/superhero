import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { HeaderLogo } from '../../../icons';
import HeaderWalletButton from './HeaderWalletButton';
import { navigationItems } from './navigationItems';
import { usePortfolioValue } from '@/hooks/usePortfolioValue';
import { useAddressByChainName } from '@/hooks/useChainName';


export default function WebAppHeader() {
  const { pathname } = useLocation();
  const { address } = useParams();
  const isDaoPath = pathname.startsWith('/trends/dao') || pathname.startsWith('/trends/daos');
  const isProfilePage = pathname.startsWith('/users/');
  
  // Support AENS chain name route: /users/<name.chain>
  const isChainName = address?.endsWith(".chain");
  const { address: resolvedAddress } = useAddressByChainName(
    isChainName && isProfilePage ? address : undefined
  );
  const effectiveAddress =
    isProfilePage && isChainName && resolvedAddress 
      ? resolvedAddress 
      : (isProfilePage ? (address as string | undefined) : null);
  
  // Fetch portfolio value for profile pages
  const { formattedValue, isLoading: isLoadingPortfolio } = usePortfolioValue({
    address: effectiveAddress || null,
    enabled: isProfilePage && !!effectiveAddress,
  });
  
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
    if (path === '/trends/daos') return isDaoPath;
    return pathname.startsWith(path);
  };

  // Dropdown menus removed; show only top-level links

  return (
    <header className="sticky top-0 z-[1000] hidden md:block border-b" style={{ 
      backgroundColor: 'rgba(12, 12, 20, 0.5)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      borderBottomColor: 'rgba(255, 255, 255, 0.14)',
      boxShadow: '0 6px 28px rgba(0,0,0,0.35)'
    }}>
      <div className="flex items-center gap-6 px-6 h-16 max-w-[min(1400px,100%)] mx-auto md:px-5 md:gap-5">
        <Link to="/" className="flex items-center no-underline hover:no-underline no-gradient-text" style={{ color: 'var(--standard-font-color)', textDecoration: 'none' }} aria-label="Superhero Home">
          <HeaderLogo className="h-8 w-auto" />
        </Link>

        <nav className="flex items-center gap-6 flex-grow md:gap-5 relative">
          {navigationItems
            .filter((item: any) => !!item && !!item.id)
            .map((item: any) => {
              const commonClass = `no-underline font-medium px-3 py-2 rounded-lg transition-all duration-200 relative`;

              // Special: add dropdown for Trends only
              const isTrendsWithChildren = item.id === 'trending' && Array.isArray(item.children) && item.children.length > 0;

              if (isTrendsWithChildren) {
                return (
                  <div key={item.id} className="relative group">
                    <Link
                      to={item.path}
                      className={commonClass}
                      style={{
                        color: isActiveRoute(item.path) ? 'var(--custom-links-color)' : 'var(--light-font-color)',
                        backgroundColor: isActiveRoute(item.path) ? 'rgba(0,255,157,0.1)' : 'transparent',
                      }}
                    >
                      {item.label}
                      <span className="ml-1">▾</span>
                      {isActiveRoute(item.path) && (
                        <span 
                          className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-sm"
                          style={{ backgroundColor: 'var(--custom-links-color)' }}
                        />
                      )}
                    </Link>

                    {/* Dropdown */}
                    <div className="hidden group-hover:block absolute left-0 top-full mt-2 min-w-[220px] rounded-xl border border-white/10 bg-[var(--background-color)] shadow-[0_12px_32px_rgba(0,0,0,0.35)] py-2 z-[1001]">
                      {item.children.map((child: any) => (
                        <Link
                          key={child.id}
                          to={child.path}
                          className="no-underline flex items-center gap-2 px-4 py-2 text-[var(--light-font-color)] hover:text-[var(--standard-font-color)] hover:bg-white/10"
                        >
                          <span className="w-5 text-center">{child.icon}</span>
                          <span className="text-sm font-medium">{child.label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              }

              if (item.isExternal) {
                return (
                  <a
                    key={item.id}
                    href={item.path}
                    target="_blank"
                    rel="noreferrer"
                    className={`${commonClass} ${
                      isActiveRoute(item.path) 
                        ? 'after:content-["\"\"] after:absolute after:-bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:w-5 after:h-0.5 after:rounded-sm'
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
                );
              }

              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={commonClass}
                  style={{
                    color: isActiveRoute(item.path) ? 'var(--custom-links-color)' : 'var(--light-font-color)',
                    backgroundColor: isActiveRoute(item.path) ? 'rgba(0,255,157,0.1)' : 'transparent',
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
              );
            })}
        </nav>

        {/* Right area lives inside the boxed header container */}
        <div className="ml-auto flex items-center gap-4 justify-end">
          {/* Portfolio value display on profile pages */}
          {isProfilePage && (
            <div className="hidden lg:flex items-center gap-3 px-4 py-2 rounded-xl bg-gradient-to-r from-white/[0.08] to-white/[0.04] border border-white/10 backdrop-blur-sm">
              <div className="flex flex-col">
                <div className="text-[10px] uppercase tracking-wider text-white/60 font-medium">
                  Portfolio Value
                </div>
                <div className="text-lg font-bold text-white leading-tight">
                  {isLoadingPortfolio ? (
                    <span className="text-white/40">Loading...</span>
                  ) : formattedValue ? (
                    formattedValue
                  ) : (
                    <span className="text-white/40">—</span>
                  )}
                </div>
              </div>
            </div>
          )}
          <HeaderWalletButton />
        </div>
      </div>
    </header>
  );
}
