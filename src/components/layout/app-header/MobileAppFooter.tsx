import {
  useEffect, useMemo, useRef, useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import AddressAvatar from '../../AddressAvatar';
import { useModal } from '../../../hooks';
import { useAeSdk } from '../../../hooks/useAeSdk';
import AppNavigationItemAction from './AppNavigationItemAction';
import { getActiveNavigationPath, getAppNavigationItems } from './navigationItems';

const MobileAppFooter = () => {
  const { pathname } = useLocation();
  const { activeAccount } = useAeSdk();
  const { openModal } = useModal();
  const navigationItems = useMemo(() => getAppNavigationItems(activeAccount), [activeAccount]);
  const footerRef = useRef<HTMLDivElement>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  const activeNavPath = useMemo(
    () => getActiveNavigationPath(pathname, navigationItems),
    [navigationItems, pathname],
  );

  useEffect(() => {
    const footer = footerRef.current;
    if (!footer) return undefined;

    const observer = new ResizeObserver(() => {
      const { height } = footer.getBoundingClientRect();
      document.documentElement.style.setProperty(
        '--mobile-footer-actual-height',
        `${height}px`,
      );
    });

    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return undefined;

    const handleResize = () => {
      setIsKeyboardOpen(viewport.height < window.innerHeight * 0.75);
    };

    viewport.addEventListener('resize', handleResize);
    return () => viewport.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      ref={footerRef}
      className={`mobile-app-footer fixed bottom-0 left-0 right-0 z-[1100] border-t lg:hidden transition-transform duration-200 ${isKeyboardOpen ? 'translate-y-full' : ''}`}
      style={{
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        backgroundColor: 'rgba(var(--background-color-rgb), 0.92)',
        borderTopColor: 'rgba(255, 255, 255, 0.12)',
        boxShadow: '0 -10px 28px rgba(0,0,0,0.28)',
      }}
    >
      <nav
        className="mx-auto flex min-h-[var(--mobile-footer-height)] max-w-[1536px] items-stretch px-1 pb-[calc(env(safe-area-inset-bottom)+6px)] pt-2"
        aria-label="Mobile navigation"
      >
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = !item.isExternal && !!item.path && item.path === activeNavPath;
          const baseClassName = 'no-gradient-text flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-center transition-colors duration-200';
          const activeClassName = isActive
            ? 'bg-white/10 text-[var(--standard-font-color)]'
            : 'text-[var(--light-font-color)] hover:bg-white/5 hover:text-[var(--standard-font-color)]';
          const itemClassName = `${baseClassName} ${activeClassName}`;
          const content = (
            <>
              {item.id === 'account' && activeAccount ? (
                <AddressAvatar address={activeAccount} size={20} />
              ) : (
                <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
              )}
              <span className="truncate text-[11px] font-medium leading-none">
                {item.label}
              </span>
            </>
          );

          return (
            <AppNavigationItemAction
              key={item.id}
              item={item}
              activeAccount={activeAccount}
              isActive={isActive}
              className={itemClassName}
              style={{ textDecoration: 'none' }}
              onConnect={() => openModal({ name: 'connect-wallet' })}
            >
              {content}
            </AppNavigationItemAction>
          );
        })}
      </nav>
    </div>
  );
};

export default MobileAppFooter;
