import React, {
  useEffect, useId, useRef, useState,
} from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeftRight, Droplets, Package, Coins, Waves, ClipboardList, Compass, ChevronDown,
} from 'lucide-react';
import './DexLayout.scss';

const navigationItems = [
  { id: 'swap', icon: ArrowLeftRight, path: '/defi/swap' },
  { id: 'pool', icon: Droplets, path: '/defi/pool' },
  { id: 'wrap', icon: Package, path: '/defi/wrap' },
];
const exploreItems = [
  { id: 'tokens', icon: Coins, path: '/defi/explore/tokens' },
  { id: 'pools', icon: Waves, path: '/defi/explore/pools' },
  { id: 'transactions', icon: ClipboardList, path: '/defi/explore/transactions' },
];
const pairRoutes = ['/defi/swap', '/defi/pool'];

interface DexLayoutProps {
  children: React.ReactNode;
}

const DexLayout = ({ children }: DexLayoutProps) => {
  const { t } = useTranslation('dex');
  const { pathname, search } = useLocation();
  const isExploreActive = pathname.startsWith('/defi/explore/');
  const [isExploreExpanded, setIsExploreExpanded] = useState(isExploreActive);
  const exploreButton = useRef<HTMLButtonElement>(null);
  const exploreId = useId();

  useEffect(() => {
    setIsExploreExpanded(isExploreActive);
  }, [pathname, isExploreActive]);

  // Carry only the selected assets between the two pair-based forms.
  const pairQuery = new URLSearchParams();
  if (pairRoutes.includes(pathname)) {
    const currentQuery = new URLSearchParams(search);
    ['from', 'to'].forEach((key) => {
      const value = currentQuery.get(key);
      if (value) pairQuery.set(key, value);
    });
  }
  const pairSearch = pairQuery.size ? `?${pairQuery}` : '';

  const handleEscape = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && isExploreExpanded) {
      setIsExploreExpanded(false);
      exploreButton.current?.focus();
    }
  };

  const renderLink = (item: typeof navigationItems[number]) => (
    <NavLink
      key={item.id}
      to={{ pathname: item.path, search: pairRoutes.includes(item.path) ? pairSearch : '' }}
      className="dex-navigation__link"
      title={t(`dexLayout.${item.id}.description`)}
      onKeyDown={handleEscape}
    >
      <item.icon aria-hidden="true" />
      <span>{t(`dexLayout.${item.id}.label`)}</span>
    </NavLink>
  );

  return (
    <div className={`dex-workspace ${isExploreExpanded ? 'dex-workspace--explore' : ''}`}>
      <nav
        className="dex-navigation"
        aria-label={t('dexLayout.navigation')}
      >
        <div className="dex-navigation__main">
          {navigationItems.map(renderLink)}
          <button
            ref={exploreButton}
            type="button"
            className="dex-navigation__explore-toggle"
            aria-expanded={isExploreExpanded}
            aria-controls={exploreId}
            data-active={isExploreActive || undefined}
            onClick={() => setIsExploreExpanded((expanded) => !expanded)}
            onKeyDown={handleEscape}
          >
            <Compass aria-hidden="true" />
            <span>{t('dexLayout.explore.label')}</span>
            <ChevronDown aria-hidden="true" className="dex-navigation__chevron" />
          </button>
        </div>
        <div id={exploreId} className={`dex-navigation__explore ${isExploreExpanded ? 'is-expanded' : ''}`}>
          <span className="dex-navigation__group-label">{t('dexLayout.exploreHeading')}</span>
          {exploreItems.map(renderLink)}
        </div>
        <span className="dex-navigation__network">æternity</span>
      </nav>
      <div className="flex-grow grid grid-cols-1 gap-0 p-1 px-2 lg:gap-0 lg:p-1 lg:px-4">
        <main className="min-w-0 overflow-hidden pt-1">{children}</main>
      </div>
    </div>
  );
};

export default DexLayout;
