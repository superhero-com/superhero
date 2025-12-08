import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HeaderLogo } from '../../../icons';
import HeaderWalletButton from './HeaderWalletButton';
import { getNavigationItems } from './navigationItems';
import LayoutSwitcher from '../LayoutSwitcher';
import TabSwitcher from '../TabSwitcher';
import { GlassSurface } from '../../ui/GlassSurface';


export default function WebAppHeader() {
  const { t: tNav } = useTranslation('navigation');
  const { t } = useTranslation('common');
  const { pathname } = useLocation();
  const navigationItems = getNavigationItems(tNav);
  const isDaoPath = pathname.startsWith('/trends/dao') || pathname.startsWith('/trends/daos');
  
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
        <Link to="/" className="flex items-center no-underline hover:no-underline no-gradient-text" style={{ color: 'var(--standard-font-color)', textDecoration: 'none' }} aria-label={t('labels.superheroHome')}>
          <HeaderLogo className="h-8 w-auto" />
        </Link>

        <TabSwitcher
          items={navigationItems
            .filter((item: any) => !!item && !!item.id && !item.isExternal)
            .map((item: any) => ({
              id: item.id,
              label: item.label,
              path: item.path,
              icon: item.icon,
            }))}
          className="flex-grow mb-0"
        />

        {/* Right area lives inside the boxed header container */}
        <div className="ml-auto flex items-center gap-4 justify-end">
          <LayoutSwitcher mode="header" />
          <HeaderWalletButton />
        </div>
      </div>
    </header>
  );
}
