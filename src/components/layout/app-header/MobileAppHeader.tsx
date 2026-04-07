import { AeButton } from '@/components/ui/ae-button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/ae-dropdown-menu';
import { DEFAULT_PAST_TIMEFRAME } from '@/utils/constants';
import { formatNumber } from '@/utils/number';
import { useQuery } from '@tanstack/react-query';
import { LogOut, User } from 'lucide-react';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AddressAvatar from '../../AddressAvatar';
import { HeaderLogo } from '../../../icons';
import { TokensService } from '../../../api/generated/services/TokensService';
import { useModal } from '../../../hooks';
import { useAeSdk } from '../../../hooks/useAeSdk';
import { useWalletConnect } from '../../../hooks/useWalletConnect';
import Favicon from '../../../svg/favicon.svg?react';

const MobileAppHeader = () => {
  const { t } = useTranslation('common');
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const { activeAccount } = useAeSdk();
  const { disconnectWallet } = useWalletConnect();
  const { openModal } = useModal();

  const handleConnect = () => openModal({ name: 'connect-wallet' });
  const handleLogout = async () => {
    await disconnectWallet();
    window.location.reload();
  };

  const tokenPathMatch = useMemo(() => pathname.match(/^\/trends\/tokens\/([^/?#]+)/i), [pathname]);
  const tokenNameParam = useMemo(() => {
    if (!tokenPathMatch) return '';
    const encoded = tokenPathMatch[1];
    try {
      return decodeURIComponent(encoded);
    } catch {
      return encoded;
    }
  }, [tokenPathMatch]);
  const isTokenDetail = Boolean(tokenNameParam);

  const { data: tokenData } = useQuery({
    queryKey: ['TokensService.findByAddress', tokenNameParam],
    queryFn: async () => {
      if (!tokenNameParam) return null;
      return TokensService.findByAddress({ address: tokenNameParam.toUpperCase() });
    },
    enabled: Boolean(tokenNameParam),
    staleTime: 60 * 1000,
  });

  const changeRaw = tokenData?.performance?.[DEFAULT_PAST_TIMEFRAME]?.current_change_percent;
  const changePercent = Number.isFinite(Number(changeRaw)) ? Number(changeRaw) : null;
  const priceRaw = Number((tokenData as any)?.price);
  const priceText = Number.isFinite(priceRaw)
    ? `$${formatNumber(priceRaw, priceRaw < 1 ? 6 : 2)}`
    : '—';

  function onNavigateBack() {
    const state = (window.history?.state as any) || {};
    const canGoBack = typeof state.idx === 'number' ? state.idx > 0 : false;
    if (canGoBack) {
      navigate(-1);
    } else {
      navigate('/trends/tokens');
    }
  }

  return (
    <div
      className="mobile-app-header z-[1100] fixed top-0 left-0 right-0 w-full lg:hidden pt-[env(safe-area-inset-top)] h-[calc(var(--mobile-navigation-height)+env(safe-area-inset-top))] border-b"
      style={{
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottomColor: 'rgba(255, 255, 255, 0.14)',
        boxShadow: '0 6px 28px rgba(0,0,0,0.35)',
      }}
    >
      <div className="px-3 flex items-center gap-2 w-full pt-[env(safe-area-inset-top)] h-[calc(var(--mobile-navigation-height)+env(safe-area-inset-top))] sm:px-2 sm:gap-1.5">
        {isTokenDetail ? (
          <>
            <button
              type="button"
              className="bg-transparent border-none text-[var(--standard-font-color)] flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg transition-all duration-200 cursor-pointer text-xl font-bold hover:bg-white/10 focus:bg-white/10 active:bg-white/20 active:scale-95"
              onClick={() => onNavigateBack()}
              aria-label={t('labels.back')}
            >
              ←
            </button>
            <div className="flex-1 min-w-0 grid grid-cols-[minmax(0,1fr)_auto] grid-rows-2 items-center gap-x-2">
              <div className="row-start-1 col-start-1 text-[13px] font-semibold text-white leading-tight line-clamp-2">
                #
                {String((tokenData as any)?.symbol || (tokenData as any)?.name || tokenNameParam || '').toUpperCase()}
              </div>
              <div className="row-start-2 col-start-1 flex items-center gap-3 text-[12px] text-white/70">
                <span className="text-white/90">{priceText}</span>
                {typeof changePercent === 'number' ? (
                  <span className={`font-semibold tabular-nums ${changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {changePercent >= 0 ? '▲' : '▼'}
                    {' '}
                    {Math.abs(changePercent).toFixed(2)}
                    %
                  </span>
                ) : (
                  <span className="text-white/50">—</span>
                )}
              </div>
              {tokenData?.sale_address && (
                <button
                  type="button"
                  className="row-span-2 col-start-2 ml-1 px-3.5 py-2 rounded-full text-[12px] font-bold tracking-wide bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] text-black shadow-md"
                  onClick={() => {
                    const params = new URLSearchParams(search);
                    params.set('showTrade', '1');
                    params.set('openTrade', '1');
                    navigate({ pathname, search: params.toString() });
                  }}
                  aria-label="Open trade"
                >
                  Trade
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <Link
              to="/"
              className="text-[var(--standard-font-color)] flex items-center min-h-[44px] min-w-[44px] no-underline hover:no-underline"
              style={{ textDecoration: 'none' }}
              aria-label={t('labels.superheroHome')}
            >
              <HeaderLogo className="h-7 w-auto" />
            </Link>
            <div className="flex-grow" />
            {activeAccount ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full border border-white/10 bg-white/5 transition-colors duration-200 hover:bg-white/10 cursor-pointer"
                    aria-label={t('aria.viewProfile')}
                  >
                    <AddressAvatar address={activeAccount} size={28} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={8} className="min-w-[180px] z-[1101]">
                  <DropdownMenuItem onClick={() => navigate(`/users/${activeAccount}`)}>
                    <User className="mr-2 h-4 w-4" />
                    {t('labels.profile')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    {t('buttons.disconnect')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <AeButton
                type="button"
                onClick={handleConnect}
                size="sm"
                noShadow
                className="h-10 rounded-full px-4 text-xs normal-case tracking-normal"
              >
                <Favicon className="h-4 w-4" />
                {t('buttons.connectWalletDex')}
              </AeButton>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MobileAppHeader;
