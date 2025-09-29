import React, { useState, useCallback, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import SearchInput from '../../SearchInput';
import { HeaderLogo, IconSearch } from '../../../icons';
// import HeaderWalletButton from './HeaderWalletButton';
import { navigationItems } from './navigationItems';
import AddressAvatar from '../../AddressAvatar';
import { useAeSdk } from '../../../hooks/useAeSdk';
import AddressAvatarWithChainName from '@/@components/Address/AddressAvatarWithChainName';
import { AeButton } from '@/components/ui/ae-button';
import { useWalletConnect } from '../../../hooks/useWalletConnect';
import { useModal } from '../../../hooks';
import FooterSection from '../FooterSection';



export default function MobileAppHeader() {
  const [showOverlay, setShowOverlay] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const t = (document.documentElement.dataset.theme as 'light' | 'dark' | undefined) || 'dark';
    return t;
  });

  const { pathname } = useLocation();
  const isOnFeed = pathname === '/';
  const { activeAccount } = useAeSdk();
  const { disconnectWallet, walletInfo } = useWalletConnect();
  const { openModal } = useModal();

  const handleConnect = () => openModal({ name: 'connect-wallet' });
  const handleLogout = () => {
    disconnectWallet();
    try { window.location.reload(); } catch {}
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
            aria-label="Back"
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
          <Link to="/" className="text-[var(--standard-font-color)] flex items-center min-h-[44px] min-w-[44px]" aria-label="Superhero Home">
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
            className="bg-transparent border-none text-[var(--standard-font-color)] flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg transition-all duration-200 text-lg cursor-pointer hover:bg-white/10 focus:bg-white/10 active:bg-white/20 active:scale-95"
            onClick={handleMenuToggle}
            aria-label="Open Menu"
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
            <div className="flex items-center justify-between py-5 px-6 pb-4 border-b border-white/10 sm:py-4 sm:px-5 sm:pb-3">
              <h2 className="m-0 text-xl font-semibold text-[var(--standard-font-color)] sm:text-lg">Menu</h2>
              <button
                className="bg-white/10 border-none text-[var(--standard-font-color)] w-11 h-11 rounded-full flex items-center justify-center text-lg cursor-pointer transition-all duration-200 hover:bg-white/20 focus:bg-white/20 active:scale-95 sm:w-10 sm:h-10 sm:text-base"
                onClick={() => setShowOverlay(false)}
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>

            <div className="py-4 px-6 border-b border-white/10 sm:py-3 sm:px-5">
              {activeAccount ? (
                <div className="flex items-center gap-3">
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
                </div>
              ) : (
                <AeButton onClick={handleConnect} className="w-full justify-center gap-2 bg-[#1161FE] hover:bg-[#1161FE] text-white border-none rounded-xl sm:rounded-full">
                  Connect Wallet
                </AeButton>
              )}
            </div>

            <nav className="flex flex-col py-5 px-6 gap-3 flex-1 sm:py-4 sm:px-6 sm:gap-2">
              {navigationItems.map(item => {
                const commonClasses = "w-full no-underline font-semibold transition-all duration-200 h-[56px] sm:h-[52px] rounded-xl text-white text-base flex items-center justify-center px-5";
                // Backgrounds inspired by desktop quick links (swapped as requested)
                const bgFeed = "bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-500/90 hover:to-blue-600/90";
                const bgDex = "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-500/90 hover:to-teal-600/90";
                const bgDefault = "bg-white/5 hover:bg-white/10";
                const bgClass = item.id === 'home' ? bgFeed : item.id === 'dex' ? bgDex : bgDefault;

                if (item.isExternal) {
                  return (
                    <div key={item.id} className={`${bgClass} rounded-xl`}>
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
                  );
                }

                return (
                  <div key={item.id} className={`${bgClass} rounded-xl`}>
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
