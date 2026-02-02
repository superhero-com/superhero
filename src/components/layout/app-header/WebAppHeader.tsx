import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HeaderLogo } from '../../../icons';
import HeaderWalletButton from './HeaderWalletButton';
import { getNavigationItems } from './navigationItems';
import { useActiveChain } from '@/hooks/useActiveChain';
import { useQueryClient } from '@tanstack/react-query';


export default function WebAppHeader() {
  const { t: tNav } = useTranslation('navigation');
  const { t } = useTranslation('common');
  const { pathname } = useLocation();
  const { selectedChain, setSelectedChain } = useActiveChain();
  const queryClient = useQueryClient();
  const navigationItems = getNavigationItems(tNav);
  
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const themeValue = (document.documentElement.dataset.theme as 'light' | 'dark' | undefined) || 'dark';
    return themeValue;
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

  const activeNavPath = React.useMemo(() => {
    const matches = navigationItems
      .filter((item: any) => !!item?.path && !item?.isExternal)
      .filter((item: any) =>
        item.path === '/'
          ? pathname === '/'
          : pathname === item.path || pathname.startsWith(`${item.path}/`)
      )
      .sort((a: any, b: any) => String(b.path).length - String(a.path).length);
    return matches[0]?.path || '';
  }, [navigationItems, pathname]);

  const isActiveRoute = (path: string) => path === activeNavPath;

  const handleChainToggle = () => {
    const next = selectedChain === 'aeternity' ? 'solana' : 'aeternity';
    setSelectedChain(next);
    queryClient.removeQueries({ queryKey: ["posts"], exact: false });
    queryClient.removeQueries({ queryKey: ["home-activities"], exact: false });
    queryClient.removeQueries({ queryKey: ["popular-posts"], exact: false });
    queryClient.removeQueries({ queryKey: ["TokensService.listAll"], exact: false });
    queryClient.removeQueries({ queryKey: ["TokensService.findByAddress"], exact: false });
  };

  // Dropdown menus removed; show only top-level links

  return (
    <aside
      className="hidden lg:flex fixed left-0 top-0 h-screen w-64 flex-col border-r z-[1000]"
      style={{
        backgroundColor: 'rgba(12, 12, 20, 0.6)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRightColor: 'rgba(255, 255, 255, 0.12)',
      }}
      aria-label="Primary"
    >
      <div className="flex items-center h-16 px-6">
        <Link
          to="/"
          className="flex items-center no-underline hover:no-underline no-gradient-text"
          style={{ color: 'var(--standard-font-color)', textDecoration: 'none' }}
          aria-label={t('labels.superheroHome')}
        >
          <HeaderLogo className="h-8 w-auto" />
        </Link>
      </div>

      <nav className="flex flex-col gap-1 px-3" aria-label="Main">
        {navigationItems
          .filter((item: any) => !!item && !!item.id)
          .map((item: any) => {
            const commonClass =
              "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors duration-200 text-[15px] font-medium";
            const isActive = isActiveRoute(item.path);
            const activeStyles = {
              color: 'var(--standard-font-color)',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
            };
            const idleStyles = {
              color: 'var(--light-font-color)',
              backgroundColor: 'transparent',
            };

            if (item.isExternal) {
              return (
                <a
                  key={item.id}
                  href={item.path}
                  target="_blank"
                  rel="noreferrer"
                  className={`${commonClass} no-gradient-text`}
                  style={isActive ? activeStyles : idleStyles}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = 'var(--standard-font-color)';
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.color = 'var(--light-font-color)';
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <span className="text-lg w-6 text-center">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </a>
              );
            }

            return (
              <Link
                key={item.id}
                to={item.path}
                className={`${commonClass} no-gradient-text`}
                style={isActive ? activeStyles : idleStyles}
              >
                <span className="text-lg w-6 text-center">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
      </nav>

      {/* Right area lives inside the boxed header container */}
      <div className="ml-auto flex items-center gap-4 justify-end mt-auto px-4 pb-6">
        <button
          onClick={handleChainToggle}
          className="px-3 py-1.5 rounded-lg border border-white/20 text-xs font-semibold uppercase tracking-wide text-white/80 hover:text-white hover:bg-white/10 transition"
          aria-label="Switch blockchain"
        >
          {selectedChain === 'aeternity' ? 'Aeternity' : 'Solana'}
        </button>
        <HeaderWalletButton />
      </div>
    </aside>
  );
}
