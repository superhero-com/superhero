import React, { useCallback, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSetAtom } from 'jotai';
import { HeaderLogo } from '../../../icons';
import { NotificationBell } from '../../../features/notifications';
import HeaderWalletButton from './HeaderWalletButton';
import LanguageSwitcher from '../LanguageSwitcher';
import AppNavigationItemAction from './AppNavigationItemAction';
import { getActiveNavigationPath, getAppNavigationItems } from './navigationItems';
import { useAeSdk } from '../../../hooks/useAeSdk';
import { useModal } from '../../../hooks/useModal';
import {
  profileEditModalFlowAtom,
  profileEditModalOpenAtom,
  profileEditModalPendingAfterConnectAtom,
} from '../../../atoms/profileEditModalAtom';

const WebAppHeader = () => {
  const { t } = useTranslation('common');
  const { pathname } = useLocation();
  const { activeAccount } = useAeSdk();
  const { openModal } = useModal();
  const setProfileEditOpen = useSetAtom(profileEditModalOpenAtom);
  const setProfileEditFlow = useSetAtom(profileEditModalFlowAtom);
  const setProfileEditPendingAfterConnect = useSetAtom(profileEditModalPendingAfterConnectAtom);

  useEffect(() => {
    // force theme to be dark
    document.documentElement.dataset.theme = 'dark';
    try {
      localStorage.setItem('theme', 'dark');
    } catch {
      // ignore quota / private mode
    }
  }, []);

  const sidebarItems = useMemo(() => getAppNavigationItems(activeAccount), [activeAccount]);

  const handleConnect = useCallback(() => {
    if (activeAccount) {
      setProfileEditOpen(true);
      return;
    }
    openModal({
      name: 'onboarding',
      props: {
        onConnected: () => {
          setProfileEditFlow({
            redirectToProfileOnClose: true,
            showSkip: true,
          });
          setProfileEditPendingAfterConnect(true);
        },
      },
    });
  }, [
    activeAccount,
    openModal,
    setProfileEditFlow,
    setProfileEditOpen,
    setProfileEditPendingAfterConnect,
  ]);

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
      <div className="flex items-center justify-between h-16 px-6">
        <Link
          to="/"
          className="flex items-center no-underline hover:no-underline"
          style={{ color: 'var(--standard-font-color)', textDecoration: 'none' }}
          aria-label={t('labels.superheroHome')}
        >
          <HeaderLogo className="h-8 w-auto" />
        </Link>
        <NotificationBell />
      </div>

      <div className="px-4 pb-3">
        <LanguageSwitcher variant="bar" side="bottom" align="start" />
      </div>

      <nav className="flex flex-col gap-1 px-4" aria-label={t('aria.main')}>
        {sidebarItems
          .filter((item: any) => !!item && !!item.id)
          .map((item: any) => {
            const commonClass = [
              'flex min-h-12 items-center gap-3 rounded-[10px] p-3',
              'text-base font-medium leading-6 transition-colors duration-200',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5d88ff]',
            ].join(' ');
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
                <span className={`w-6 shrink-0 flex items-center justify-center ${isActive ? 'text-[#5d88ff]' : ''}`}>
                  <Icon className="w-[18px] h-[18px]" />
                </span>
                <span className="truncate">{t(item.labelKey, { ns: 'common' })}</span>
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
