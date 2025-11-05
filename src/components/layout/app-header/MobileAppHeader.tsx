import React, { useState, useCallback, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SearchInput from '../../SearchInput';
import { HeaderLogo, IconSearch } from '../../../icons';
// import HeaderWalletButton from './HeaderWalletButton';
import { getNavigationItems } from './navigationItems';
import AddressAvatar from '../../AddressAvatar';
import { useAeSdk } from '../../../hooks/useAeSdk';
import AddressAvatarWithChainName from '@/@components/Address/AddressAvatarWithChainName';
import { AeButton } from '@/components/ui/ae-button';
import { useWalletConnect } from '../../../hooks/useWalletConnect';
import { useModal } from '../../../hooks';
import FooterSection from '../FooterSection';



export default function MobileAppHeader() {
  const { t: tNav } = useTranslation('navigation');
  const { t } = useTranslation('common');
  const navigationItems = getNavigationItems(tNav);
  const [showOverlay, setShowOverlay] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const themeValue = (document.documentElement.dataset.theme as 'light' | 'dark' | undefined) || 'dark';
    return themeValue;
  });

  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isOnFeed = pathname === '/';
  const { activeAccount } = useAeSdk();
  const { disconnectWallet, walletInfo } = useWalletConnect();
  const { openModal } = useModal();

  const handleConnect = () => openModal({ name: 'connect-wallet' });
  const handleLogout = () => {
    disconnectWallet();
    try { window.location.reload(); } catch {}
  };
  const handleProfileClick = () => {
    if (activeAccount) {
      navigate(`/users/${activeAccount}`);
      setShowOverlay(false);
    }
  };

  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch { }
    setTheme(next);
  }, [theme]);

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

  // Close mobile overlays when route changes
  useEffect(() => {
    setShowOverlay(false);
    setShowSearch(false);
  }, [pathname]);

  // Close mobile overlays on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowOverlay(false);
        setShowSearch(false);
      }
    };

    if (showOverlay || showSearch) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showOverlay, showSearch]);

  // Active route helper for mobile nav buttons
  const isActiveRoute = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <div className="z-[1100] fixed top-0 left-0 right-0 w-full md:hidden pt-[env(safe-area-inset-top)] h-[calc(var(--mobile-navigation-height)+env(safe-area-inset-top))] border-b" style={{
      backgroundColor: 'rgba(12, 12, 20, 0.5)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottomColor: 'rgba(255, 255, 255, 0.14)',
      boxShadow: '0 6px 28px rgba(0,0,0,0.35)'
    }}>
      {/* Search Mode */}
      {showSearch ? (
        <div className="px-3 flex items-center gap-3 w-full pt-[env(safe-area-inset-top)] h-[calc(var(--mobile-navigation-height)+env(safe-area-inset-top))]">
          <button
            className="bg-transparent border-none text-[var(--standard-font-color)] flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg transition-all duration-200 cursor-pointer text-xl font-bold hover:bg-white/10 focus:bg-white/10 active:bg-white/20 active:scale-95"
            onClick={() => setShowSearch(false)}
            aria-label={t('labels.back')}
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
          <Link to="/" className="text-[var(--standard-font-color)] flex items-center min-h-[44px] min-w-[44px] no-underline hover:no-underline no-gradient-text" style={{ textDecoration: 'none' }} aria-label={t('labels.superheroHome')}>
            <HeaderLogo className="h-7 w-auto" />
          </Link>
          <div className="flex-grow hidden md:block" />

          {/* <button
            className="bg-transparent border-none text-[var(--standard-font-color)] flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg transition-all duration-200 text-lg cursor-pointer hover:bg-white/10 focus:bg-white/10 active:bg-white/20 active:scale-95"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? '☀︎' : '☽'}
          </button>

          {isOnFeed && (
            <button
              className="bg-transparent border-none text-[var(--standard-font-color)] flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg transition-all duration-200 text-lg cursor-pointer hover:bg-white/10 focus:bg-white/10 active:bg-white/20 active:scale-95"
              onClick={handleSearchToggle}
              aria-label="Search"
            >
              <IconSearch />
            </button>
          )} */}
          {/* Wallet button hidden in the top mobile header */}
          {/* <HeaderWalletButton className="flex-1" /> */}
          <div className="flex-grow md:hidden" />

          <button
            className="bg-transparent border-none text-[var(--standard-font-color)] flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg transition-all duration-200 text-lg cursor-pointer hover:bg-white/10 focus:bg-white/10 active:bg-transparent shadow-none active:shadow-none focus:shadow-none outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0"
            onClick={(e) => { handleMenuToggle(); try { (e.currentTarget as HTMLButtonElement).blur(); } catch {} }}
            onTouchEnd={(e) => { try { (e.currentTarget as HTMLButtonElement).blur(); } catch {} }}
            aria-label={t('labels.openMenu')}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            tabIndex={-1}
          >
            <span className="flex items-center gap-2">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path d="M4 6h16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M4 12h16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M4 18h16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
              {activeAccount && (
                <AddressAvatar address={activeAccount} size={28} />
              )}
            </span>
          </button>
        </div>
      )}

      {/* Navigation Overlay */}
      {showOverlay && (
        <div className="fixed inset-0 bg-black/80 flex items-start justify-end z-[1100] animate-[fadeIn_0.2s_ease-out] backdrop-blur-[4px] sm:items-start sm:justify-center" onClick={() => setShowOverlay(false)}>
          <div className="z-[1101] text-[var(--light-font-color)] relative w-full max-w-[320px] h-screen bg-[var(--background-color)] flex flex-col overflow-y-auto animate-[slideInRight_0.3s_ease-out] shadow-[-10px_0_30px_rgba(0,0,0,0.3)] sm:max-w-full sm:w-full sm:animate-[slideInUp_0.3s_ease-out] sm:shadow-[0_-10px_30px_rgba(0,0,0,0.3)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between h-[70px] px-3 border-b border-white/10 sm:px-3 flex-shrink-0">
              <h2
                className="m-0 px-4 text-md font-semibold uppercase tracking-[0.02em] !text-white/80 !bg-transparent"
                style={{
                  color: 'rgba(255,255,255,0.8)',
                  background: 'transparent',
                  backgroundImage: 'none',
                  WebkitTextFillColor: 'rgba(255,255,255,0.8)',
                  WebkitBackgroundClip: 'initial' as any,
                }}
              >
                {t('labels.menu')}
              </h2>
              <button
                className="bg-white/10 border-none text-[var(--standard-font-color)] w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center leading-none cursor-pointer transition-all duration-200 hover:bg-white/20 focus:bg-white/20 active:scale-95 sm:w-10 sm:h-10 outline-none focus:outline-none focus-visible:outline-none ring-0 focus:ring-0 focus-visible:ring-0 shadow-none focus:shadow-none active:shadow-none"
                onClick={(e) => { setShowOverlay(false); try { (e.currentTarget as HTMLButtonElement).blur(); } catch {} }}
                aria-label={t('labels.closeMenu')}
                tabIndex={-1}
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="py-4 px-6 border-b border-white/10 sm:py-3 sm:px-5">
              {activeAccount ? (
                <div>
                  <button
                    onClick={handleProfileClick}
                    className="w-full flex items-center gap-3 hover:opacity-80 transition-opacity"
                  >
                    <AddressAvatarWithChainName
                      isHoverEnabled={false}
                      address={activeAccount}
                      size={40}
                      overlaySize={18}
                      showBalance={true}
                      showAddressAndChainName={false}
                      showPrimaryOnly={true}
                      hideFallbackName={true}
                      contentClassName="px-2 pb-0"
                    />
                  </button>
                  <div className="mt-3">
                    <AeButton
                      onClick={handleLogout}
                      className="w-full justify-center bg-white/5 border border-white/10 rounded-xl"
                      variant="ghost"
                    >
                      {t('buttons.disconnect')}
                    </AeButton>
                  </div>
                </div>
              ) : (
                <AeButton onClick={handleConnect} className="w-full justify-center gap-2 bg-[#1161FE] hover:bg-[#1161FE] text-white border-none rounded-xl sm:rounded-full text-sm">
                  {t('buttons.connectWalletDex')}
                </AeButton>
              )}
            </div>

            <nav className="flex flex-col py-5 px-6 gap-3 flex-1 sm:py-4 sm:px-6 sm:gap-2">
              {navigationItems.filter(item => !!item.id).map((item, index) => {
                const commonClasses = "w-full no-underline font-semibold transition-all duration-200 h-[56px] sm:h-[52px] rounded-xl text-white text-base flex items-center justify-center px-5";
                const baseBg = "bg-white/5 hover:bg-white/10";
                const node = item.isExternal ? (
                  <div key={item.id} className={`${baseBg} rounded-xl`}>
                    <a
                      href={item.path}
                      target="_blank"
                      rel="noreferrer"
                      className={`${commonClasses} bg-transparent`}
                      style={{ WebkitTextFillColor: 'white', WebkitBackgroundClip: 'initial' as any, background: 'none' }}
                      onClick={handleNavigationClick}
                    >
                      <span className="text-lg sm:text-base">{item.label}</span>
                    </a>
                  </div>
                ) : (
                  <div key={item.id} className={`${baseBg} rounded-xl ${isActiveRoute(item.path) ? 'ring-2 ring-[var(--accent-color)]' : ''}`}>
                    <Link
                      to={item.path}
                      onClick={handleNavigationClick}
                      className={`${commonClasses} bg-transparent`}
                      style={{ WebkitTextFillColor: 'white', WebkitBackgroundClip: 'initial' as any, background: 'none' }}
                    >
                      <span className="text-lg sm:text-base">{item.label}</span>
                    </Link>
                  </div>
                );

                return (
                  <React.Fragment key={`nav-${item.id}`}>
                    {node}
                    {Array.isArray((item as any).children) && (item as any).children.length > 0 && (
                      <div className="ml-2 grid gap-2">
                        {(item as any).children.map((child: any) => (
                          <div key={child.id} className={`${baseBg} rounded-xl`}>
                            <Link
                              to={child.path}
                              onClick={handleNavigationClick}
                              className={`${commonClasses} bg-transparent`}
                              style={{ WebkitTextFillColor: 'white', WebkitBackgroundClip: 'initial' as any, background: 'none' }}
                            >
                              <span className="text-lg sm:text-base">{child.label}</span>
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                    {index === 1 && (
                      <div className={`${baseBg} rounded-xl`}>
                        <Link
                          to="/defi/buy-ae-with-eth"
                          onClick={handleNavigationClick}
                          className={`${commonClasses} bg-transparent`}
                          style={{ WebkitTextFillColor: 'white', WebkitBackgroundClip: 'initial' as any, background: 'none' }}
                        >
                          <span className="text-lg sm:text-base">{t('labels.buyAe')}</span>
                        </Link>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </nav>

            {/* Footer from right rail inside mobile menu (compact) */}
            <div className="mt-auto pb-5 pt-2 px-3">
              <FooterSection compact />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
