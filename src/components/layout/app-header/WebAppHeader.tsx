import React, { useCallback, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HeaderLogo } from '../../../icons';
import HeaderWalletButton from './HeaderWalletButton';
import { getNavigationItems } from './navigationItems';
import { useAeSdk } from '../../../hooks/useAeSdk';
import { useModal } from '../../../hooks';

const WebAppHeader = () => {
  const { t } = useTranslation('common');
  const { pathname } = useLocation();
  const navigationItems = getNavigationItems();
  const { activeAccount } = useAeSdk();
  const { openModal } = useModal();

  useEffect(() => {
    // force theme to be dark
    document.documentElement.dataset.theme = 'dark';
    localStorage.setItem('theme', 'dark');
  }, []);

  const sidebarItems = useMemo(() => {
    const items = [...navigationItems];
    items.push({
      id: 'account',
      label: 'Account',
      path: activeAccount ? `/users/${activeAccount}` : '',
      icon: '👤',
    });
    return items;
  }, [navigationItems, activeAccount]);

  const handleConnect = useCallback(() => openModal({ name: 'connect-wallet' }), [openModal]);

  const activeNavPath = React.useMemo(() => {
    const matches = sidebarItems
      .filter((item: any) => !!item?.path && !item?.isExternal)
      .filter((item: any) => (item.path === '/'
        ? pathname === '/'
        : pathname === item.path || pathname.startsWith(`${item.path}/`)))
      .sort((a: any, b: any) => String(b.path).length - String(a.path).length);
    return matches[0]?.path || '';
  }, [sidebarItems, pathname]);

  const isActiveRoute = (path: string) => path === activeNavPath;

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
        {sidebarItems
          .filter((item: any) => !!item && !!item.id)
          .map((item: any) => {
            const commonClass = 'flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors duration-200 text-[18px] font-medium';
            const isActive = isActiveRoute(item.path);
            const activeStyles = {
              color: 'var(--standard-font-color)',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
            };
            const idleStyles = {
              color: 'var(--light-font-color)',
              backgroundColor: 'transparent',
            };

            if (item.id === 'account' && !activeAccount) {
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`${commonClass} no-gradient-text text-left`}
                  style={idleStyles}
                  onClick={handleConnect}
                >
                  <span className="text-lg w-6 text-center">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </button>
              );
            }

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

      <div className="mt-auto px-4 pb-6">
        <HeaderWalletButton />
      </div>
    </aside>
  );
};

export default WebAppHeader;
