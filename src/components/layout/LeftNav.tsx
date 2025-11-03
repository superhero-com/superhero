import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HeaderLogo } from '../../icons';
import HeaderWalletButton from './app-header/HeaderWalletButton';
import { getNavigationItems } from './app-header/navigationItems';

export default function LeftNav() {
  const { t } = useTranslation('common');
  const navigationItems = getNavigationItems((key: string) => t(key, { ns: 'navigation' }));
  const { pathname } = useLocation();
  const isActive = (path: string) => (path === '/' ? pathname === '/' : pathname.startsWith(path));

  return (
  <nav className="flex flex-col gap-2 pr-2 min-h-screen">
      <Link to="/" className="no-underline hover:no-underline no-gradient-text px-3 py-2 rounded-xl text-[var(--standard-font-color)] w-fit" style={{ textDecoration: 'none' }} aria-label={t('labels.superheroHome')}>
        <HeaderLogo className="h-8 w-auto" />
      </Link>
      <div className="grid gap-1">
        {navigationItems.map((item) => {
          const active = isActive(item.path);
          const hasChildren = Array.isArray((item as any).children) && (item as any).children.length > 0;
          return (
            <div key={item.id}>
              {item.isExternal ? (
                <a
                  href={item.path}
                  target="_blank"
                  rel="noreferrer"
                  className={`no-underline flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${
                    active ? 'bg-white/10 text-white' : 'text-[var(--light-font-color)] hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                </a>
              ) : (
                <Link
                  to={item.path}
                  className={`no-underline flex items-center gap-3 px-3 py-2 rounded-xl transition-colors ${
                    active ? 'bg-white/10 text-white' : 'text-[var(--light-font-color)] hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              )}

              {hasChildren && (
                <div className="grid gap-1 mt-1 ml-8">
                  {(item as any).children.map((child: any) => {
                    const childActive = isActive(child.path);
                    return (
                      <Link
                        key={child.id}
                        to={child.path}
                        className={`no-underline flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                          childActive ? 'bg-white/10 text-white' : 'text-[var(--light-font-color)] hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <span className="w-5 text-center">{child.icon}</span>
                        <span className="text-sm">{child.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-auto pt-3 border-t border-white/10">
        <div className="hidden lg:block">
          <HeaderWalletButton />
        </div>
      </div>
    </nav>
  );
}


