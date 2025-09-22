import React, { useEffect, useState } from 'react';
import { Backend, TrendminerApi } from '../../api/backend';
import configs from '../../configs';

export default function FooterSection() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [apiStatus, setApiStatus] = useState<{
    backend: 'online' | 'offline' | 'checking';
    trendminer: 'online' | 'offline' | 'checking';
    dex: 'online' | 'offline' | 'checking';
  }>({ backend: 'checking', trendminer: 'checking', dex: 'checking' });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const checkApiStatus = async () => {
      try {
        await Backend.getTopics();
        setApiStatus((p) => ({ ...p, backend: 'online' }));
      } catch {
        setApiStatus((p) => ({ ...p, backend: 'offline' }));
      }

      try {
        await TrendminerApi.listTrendingTags({ limit: 1 });
        setApiStatus((p) => ({ ...p, trendminer: 'online' }));
      } catch {
        setApiStatus((p) => ({ ...p, trendminer: 'offline' }));
      }

      try {
        await Backend.getPrice();
        setApiStatus((p) => ({ ...p, dex: 'online' }));
      } catch {
        setApiStatus((p) => ({ ...p, dex: 'offline' }));
      }
    };

    checkApiStatus();
    const interval = setInterval(checkApiStatus, 30000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const statusEmoji = (s: 'online' | 'offline' | 'checking') =>
    s === 'online' ? '🟢' : s === 'offline' ? '🔴' : '🟡';
  const statusColor = (s: 'online' | 'offline' | 'checking') =>
    s === 'online'
      ? 'var(--neon-green)'
      : s === 'offline'
      ? 'var(--neon-pink)'
      : 'var(--neon-yellow)';

  return (
    <footer className="border-t mt-6 py-4 md:py-5 md:mt-8" style={{ borderTopColor: 'var(--search-nav-border-color)' }}>
      <div className="max-w-[min(1536px,100%)] mx-auto px-4 flex gap-4 items-center md:flex-col md:gap-4 md:px-4 md:text-center sm:px-3 sm:gap-3">
        <div className="text-sm md:order-2 md:text-[13px]" style={{ color: 'var(--light-font-color)' }}>Superhero is Open Source</div>
        <nav className="ml-auto flex gap-3 flex-wrap md:ml-0 md:order-1 md:justify-center md:gap-2 sm:gap-1.5">
          {
            configs.features.trendminer && (
              <a
                href="/trendminer"
                className="no-underline text-sm py-2 px-3 rounded-lg transition-all duration-200 whitespace-nowrap md:text-[13px] md:py-1.5 md:px-2.5 sm:text-xs sm:py-1.5 sm:px-2"
                style={{ color: 'var(--light-font-color)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--custom-links-color)';
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--light-font-color)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                TrendCloud
              </a>
            )
          }
          <a
            href="/terms"
            className="no-underline text-sm py-2 px-3 rounded-lg transition-all duration-200 whitespace-nowrap md:text-[13px] md:py-1.5 md:px-2.5 sm:text-xs sm:py-1.5 sm:px-2"
            style={{ color: 'var(--light-font-color)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--custom-links-color)';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--light-font-color)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Terms
          </a>
          <a
            href="/privacy"
            className="no-underline text-sm py-2 px-3 rounded-lg transition-all duration-200 whitespace-nowrap md:text-[13px] md:py-1.5 md:px-2.5 sm:text-xs sm:py-1.5 sm:px-2"
            style={{ color: 'var(--light-font-color)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--custom-links-color)';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--light-font-color)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Privacy
          </a>
          <a
            href="https://github.com/superhero-com/superhero"
            target="_blank"
            rel="noreferrer"
            className="no-underline text-sm py-2 px-3 rounded-lg transition-all duration-200 whitespace-nowrap md:text-[13px] md:py-1.5 md:px-2.5 sm:text-xs sm:py-1.5 sm:px-2"
            style={{ color: 'var(--light-font-color)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--custom-links-color)';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--light-font-color)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Contribute on GitHub
          </a>
        </nav>
      </div>
      <div className="max-w-[min(1536px,100%)] mx-auto px-4 mt-2 flex justify-end md:justify-center md:px-4 sm:px-3">
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-2 shadow-sm">
          <div className="text-[11px] text-[var(--light-font-color)] uppercase tracking-wide mb-1 text-center">Status</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm md:text-[13px] sm:text-xs">
            <span style={{ color: isOnline ? 'var(--neon-green)' : 'var(--neon-pink)' }}>
              {isOnline ? '🟢 Blockchain' : '🔴 Blockchain'}
            </span>
            <span style={{ color: statusColor(apiStatus.backend) }}>
              {`${statusEmoji(apiStatus.backend)} Backend`}
            </span>
            <span style={{ color: statusColor(apiStatus.trendminer) }}>
              {`${statusEmoji(apiStatus.trendminer)} Trendminer`}
            </span>
            <span style={{ color: statusColor(apiStatus.dex) }}>
              {`${statusEmoji(apiStatus.dex)} DEX`}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}


