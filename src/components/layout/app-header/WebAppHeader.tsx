import React, { useCallback, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HeaderLogo } from '../../../icons';
import HeaderWalletButton from './HeaderWalletButton';
import AppNavigationItemAction from './AppNavigationItemAction';
import { getActiveNavigationPath, getAppNavigationItems } from './navigationItems';
import { useAeSdk } from '../../../hooks/useAeSdk';
import { useModal } from '../../../hooks';

const WebAppHeader = () => {
  const { t } = useTranslation('common');
  const { pathname } = useLocation();
  const { activeAccount } = useAeSdk();
  const { openModal } = useModal();

  useEffect(() => {
    // force theme to be dark
    document.documentElement.dataset.theme = 'dark';
    localStorage.setItem('theme', 'dark');
  }, []);

  const sidebarItems = useMemo(() => getAppNavigationItems(activeAccount), [activeAccount]);

  const handleConnect = useCallback(() => openModal({ name: 'connect-wallet' }), [openModal]);

  const activeNavPath = useMemo(
    () => getActiveNavigationPath(pathname, sidebarItems),
    [pathname, sidebarItems],
  );

  const isActiveRoute = (path?: string) => !!path && path === activeNavPath;

  return (
    <aside
      className="hidden lg:flex fixed left-0 top-0 h-screen w-64 flex-col border-r z-[1000]"
      style={{
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRightColor: 'rgba(255, 255, 255, 0.12)',
      }}
      aria-label={t('aria.primary')}
    >
      <div className="flex items-center h-16 px-6">
        <Link
          to="/"
          className="flex items-center no-underline hover:no-underline"
          style={{ color: 'var(--standard-font-color)', textDecoration: 'none' }}
          aria-label={t('labels.superheroHome')}
        >
          <HeaderLogo className="h-8 w-auto" />
        </Link>
      </div>

      <nav className="flex flex-col gap-1 px-3" aria-label={t('aria.main')}>
        {sidebarItems
          .filter((item: any) => !!item && !!item.id)
          .map((item: any) => {
            const commonClass = 'flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors duration-200 text-[18px] font-medium';
            const isActive = isActiveRoute(item.path);
            const isDisconnectedAccount = item.id === 'account' && !activeAccount;
            const activeStyles = {
              color: 'var(--standard-font-color)',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
            };
            const idleStyles = {
              color: 'var(--light-font-color)',
              backgroundColor: 'transparent',
            };
            let itemStyles = idleStyles;
            if (isActive) itemStyles = activeStyles;
            const Icon = item.icon;

            return (
              <AppNavigationItemAction
                key={item.id}
                item={item}
                activeAccount={activeAccount}
                isActive={isActive}
                className={isDisconnectedAccount ? `${commonClass} text-left` : commonClass}
                style={itemStyles}
                onConnect={handleConnect}
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
                <span className="w-6 flex items-center justify-center">
                  <Icon className="w-[18px] h-[18px]" />
                </span>
                <span className="truncate">{item.label}</span>
              </AppNavigationItemAction>
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
