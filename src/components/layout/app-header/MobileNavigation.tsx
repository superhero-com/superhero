import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SearchInput from '../../SearchInput';
import { HeaderLogo, IconSearch, IconMobileMenu } from '../../../icons';
import { getNavigationItems } from './navigationItems';

const MobileNavigation = () => {
  const { t } = useTranslation(['common', 'navigation']);
  const [showOverlay, setShowOverlay] = useState(false);
  const getNavLabel = (item: { id: string; label?: string }) => {
    const key: Record<string, string> = {
      home: 'navigation:mobileHome',
      'refer-earn': 'navigation:referEarn',
      dex: 'navigation:defi',
      explore: 'navigation:explore',
    };
    return key[item.id] ? t(key[item.id]) : (item.label ?? item.id);
  };
  const [showSearch, setShowSearch] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const themeValue = (document.documentElement.dataset.theme as 'light' | 'dark' | undefined) || 'dark';
    return themeValue;
  });
  const { pathname } = useLocation();
  const isOnFeed = pathname === '/';
  const navigationItems = getNavigationItems();

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

  const activeNavPath = React.useMemo(() => {
    const matches = navigationItems
      .filter((item: any) => !!item?.path && !item?.isExternal)
      .filter((item: any) => (item.path === '/'
        ? pathname === '/'
        : pathname === item.path || pathname.startsWith(`${item.path}/`)))
      .sort((a: any, b: any) => String(b.path).length - String(a.path).length);
    return matches[0]?.path || '';
  }, [navigationItems, pathname]);

  const isActiveRoute = (path: string) => path === activeNavPath;

  return (
    <div className="z-[101] fixed top-0 left-0 right-0 w-full bg-[rgba(var(--background-color-rgb),0.95)] backdrop-blur-[20px] border-b border-white/10 shadow-[0_2px_20px_rgba(0,0,0,0.1)] lg:hidden pt-[env(safe-area-inset-top)] h-[calc(var(--mobile-navigation-height)+env(safe-area-inset-top))]">
      {/* Search Mode */}
      {showSearch ? (
        <div className="px-3 flex items-center gap-3 w-full pt-[env(safe-area-inset-top)] h-[calc(var(--mobile-navigation-height)+env(safe-area-inset-top))]">
          <button
            type="button"
            className="bg-transparent border-none text-[var(--standard-font-color)] flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg transition-all duration-200 cursor-pointer text-xl font-bold hover:bg-white/10 focus:bg-white/10 active:bg-white/20 active:scale-95"
            onClick={() => setShowSearch(false)}
            aria-label={t('aria.back')}
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
          <Link to="/" className="text-[var(--standard-font-color)] flex items-center min-h-[44px] min-w-[44px]" aria-label={t('aria.superheroHome')}>
            <HeaderLogo className="h-7 w-auto" />
          </Link>
          <div className="flex-grow" />

          <button
            type="button"
            className="bg-transparent border-none text-[var(--standard-font-color)] flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg transition-all duration-200 text-lg cursor-pointer hover:bg-white/10 focus:bg-white/10 active:bg-white/20 active:scale-95"
            onClick={() => {
              const next = theme === 'dark' ? 'light' : 'dark';
              document.documentElement.dataset.theme = next;
              try {
                localStorage.setItem('theme', next);
              } catch {
                // Ignore localStorage write failures
              }
              setTheme(next);
            }}
            aria-label={t('aria.toggleTheme')}
          >
            {theme === 'dark' ? '☀︎' : '☽'}
          </button>

          {isOnFeed && (
            <button
              type="button"
              className="bg-transparent border-none text-[var(--standard-font-color)] flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg transition-all duration-200 text-lg cursor-pointer hover:bg-white/10 focus:bg-white/10 active:bg-white/20 active:scale-95"
              onClick={handleSearchToggle}
              aria-label={t('aria.search')}
            >
              <IconSearch />
            </button>
          )}

          <button
            type="button"
            className="bg-transparent border-none text-[var(--standard-font-color)] flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg transition-all duration-200 text-lg cursor-pointer hover:bg-white/10 focus:bg-white/10 active:bg-white/20 active:scale-95"
            onClick={handleMenuToggle}
            aria-label={t('aria.openMenu')}
          >
            <IconMobileMenu />
          </button>

        </div>
      )}

      {/* Navigation Overlay */}
      {showOverlay && (
        <div className="fixed inset-0 bg-black/80 flex items-start justify-end z-[1000] sm:items-start sm:justify-center">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={() => setShowOverlay(false)}
            aria-label={t('aria.closeMenuOverlay')}
          />
          <div className="z-[1001] text-[var(--light-font-color)] relative w-full max-w-[320px] h-screen bg-[var(--background-color)] flex flex-col overflow-y-auto sm:max-w-full sm:w-full">
            <div className="flex items-center justify-between h-[70px] px-6 border-b border-white/10 sm:px-5 flex-shrink-0">
              <h2 className="m-0 text-xl font-semibold text-[var(--standard-font-color)] sm:text-lg">{t('labels.menu')}</h2>
              <button
                type="button"
                className="bg-white/10 border-none text-[var(--standard-font-color)] w-11 h-11 rounded-full flex items-center justify-center text-lg cursor-pointer transition-all duration-200 hover:bg-white/20 focus:bg-white/20 active:scale-95 sm:w-10 sm:h-10 sm:text-base"
                onClick={() => setShowOverlay(false)}
                aria-label={t('aria.closeMenu')}
              >
                ✕
              </button>
            </div>

            <nav className="flex flex-col py-4 px-6 gap-2 flex-1 sm:py-3 sm:px-5 sm:gap-1.5">
              {navigationItems
                .filter((item: any) => !!item && !!item.id)
                .map((item: any) => {
                  const isActive = isActiveRoute(item.path);
                  const baseClass = 'flex items-center py-4 px-5 rounded-xl text-[var(--standard-font-color)] no-underline font-medium transition-all duration-200 min-h-[56px] gap-4 hover:bg-white/10 hover:translate-x-1 active:bg-white/15 active:translate-x-0.5 active:scale-[0.98] sm:py-3.5 sm:px-4 sm:min-h-[52px] sm:gap-3';
                  const activeClass = isActive ? 'bg-white/15' : 'bg-white/5';

                  const Icon = item.icon;
                  
                  if (item.isExternal) {
                    return (
                      <a
                        key={item.id}
                        href={item.path}
                        target="_blank"
                        rel="noreferrer"
                        className={`${baseClass} ${activeClass}`}
                        onClick={handleNavigationClick}
                      >
                        <span className="w-6 text-center sm:w-5 flex items-center justify-center">
                          <Icon className="w-5 h-5 sm:w-[18px] sm:h-[18px]" />
                        </span>
                        <span className="text-base sm:text-[15px]">{getNavLabel(item)}</span>
                      </a>
                    );
                  }

                  return (
                    <Link
                      key={item.id}
                      to={item.path}
                      onClick={handleNavigationClick}
                      className={`${baseClass} ${activeClass}`}
                    >
                      <span className="w-6 text-center sm:w-5 flex items-center justify-center">
                        <Icon className="w-5 h-5 sm:w-[18px] sm:h-[18px]" />
                      </span>
                      <span className="text-base sm:text-[15px]">{getNavLabel(item)}</span>
                    </Link>
                  );
                })}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileNavigation;
