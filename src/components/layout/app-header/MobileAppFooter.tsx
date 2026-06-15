import {
  useEffect, useMemo, useRef, useState,
} from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useSetAtom } from 'jotai';
import AddressAvatar from '../../AddressAvatar';
import { useAeSdk } from '../../../hooks/useAeSdk';
import { useModal } from '../../../hooks/useModal';
import AppNavigationItemAction from './AppNavigationItemAction';
import {
  getActiveNavigationPath,
  getMobileFooterNavigationItems,
  getMobileMoreNavigationItems,
} from './navigationItems';
import {
  profileEditModalFlowAtom,
  profileEditModalOpenAtom,
  profileEditModalPendingAfterConnectAtom,
} from '../../../atoms/profileEditModalAtom';

const MobileAppFooter = () => {
  const { pathname } = useLocation();
  const { activeAccount } = useAeSdk();
  const { openModal } = useModal();
  const setProfileEditOpen = useSetAtom(profileEditModalOpenAtom);
  const setProfileEditFlow = useSetAtom(profileEditModalFlowAtom);
  const setProfileEditPendingAfterConnect = useSetAtom(profileEditModalPendingAfterConnectAtom);
  const navigationItems = useMemo(
    () => getMobileFooterNavigationItems(activeAccount),
    [activeAccount],
  );
  const moreItems = useMemo(() => getMobileMoreNavigationItems(), []);
  const footerRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const activeNavPath = useMemo(
    () => getActiveNavigationPath(pathname, navigationItems),
    [navigationItems, pathname],
  );

  const activeMorePath = useMemo(
    () => getActiveNavigationPath(pathname, moreItems),
    [moreItems, pathname],
  );

  const isMoreActive = Boolean(activeMorePath);

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

  useEffect(() => {
    if (!isMoreOpen) return undefined;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!moreMenuRef.current?.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMoreOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMoreOpen]);

  useEffect(() => {
    setIsMoreOpen(false);
  }, [pathname]);

  const baseItemClassName = 'no-gradient-text flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-center transition-colors duration-200';

  const getItemStateClassName = (isActive: boolean) => (isActive
    ? 'bg-white/10 text-[var(--standard-font-color)]'
    : 'text-[var(--light-font-color)] hover:bg-white/5 hover:text-[var(--standard-font-color)]');

  const handleSuperheroIdClick = () => {
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
  };

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
          const itemClassName = `${baseItemClassName} ${getItemStateClassName(isActive)}`;
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
              isActive={isActive}
              className={itemClassName}
              style={{ textDecoration: 'none' }}
              onConnect={handleSuperheroIdClick}
            >
              {content}
            </AppNavigationItemAction>
          );
        })}

        {moreItems.length > 0 && (
          <div ref={moreMenuRef} className="relative flex min-w-0 flex-1">
            {isMoreOpen && (
              <div
                className="absolute bottom-[calc(100%+12px)] right-0 z-[1101] min-w-[180px] rounded-xl border bg-card/95 p-1 text-card-foreground shadow-card backdrop-blur-card"
                style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
                role="menu"
                aria-label="More options"
              >
                {moreItems.map((item) => {
                  if (!item.path) return null;
                  const Icon = item.icon;
                  const isActive = item.path === activeMorePath;

                  return (
                    <Link
                      key={item.id}
                      to={item.path}
                      className={`flex min-h-[var(--mobile-footer-height)] w-full items-center gap-2 rounded-lg px-3 py-2 text-sm no-underline transition-colors justify-center ${
                        isActive
                          ? 'bg-white/10 text-[var(--standard-font-color)]'
                          : 'text-card-foreground hover:bg-accent hover:text-accent-foreground'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                      role="menuitem"
                      onClick={() => setIsMoreOpen(false)}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}

            <button
              type="button"
              className={`${baseItemClassName} ${getItemStateClassName(isMoreActive || isMoreOpen)} w-full border-0 cursor-pointer`}
              aria-label="More options"
              aria-haspopup="menu"
              aria-expanded={isMoreOpen}
              onClick={() => setIsMoreOpen((open) => !open)}
            >
              <Menu className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
              <span className="truncate text-[11px] font-medium leading-none">
                More
              </span>
            </button>
          </div>
        )}
      </nav>
    </div>
  );
};

export default MobileAppFooter;
