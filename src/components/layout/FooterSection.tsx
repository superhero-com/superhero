import WebSocketClient from '@/libs/WebSocketClient';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import configs from '../../configs';

export default function FooterSection({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [apiStatus, setApiStatus] = useState<{
    backend: 'online' | 'offline' | 'checking';
    trending: 'online' | 'offline' | 'checking';
    dex: 'online' | 'offline' | 'checking';
  }>({ backend: 'checking', trending: 'checking', dex: 'checking' });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const checkApiStatus = async () => {
      const isConnected = WebSocketClient.isConnected();
      const status = isConnected ? 'online' : 'offline';
      setIsOnline(navigator.onLine);
      setApiStatus((p) => ({ ...p, backend: status, trending: status, dex: status }));
    };

    
    const interval = setInterval(checkApiStatus, 5000);
    setTimeout(() => {
      checkApiStatus();
    }, 1000);
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
    <footer className={`${compact ? 'border-t mt-3 py-3' : 'border-t mt-6 py-4 md:py-5 md:mt-8'}`} style={{ borderTopColor: 'var(--search-nav-border-color)' }}>
      <div className={`max-w-[min(1400px,100%)] mx-auto ${compact ? 'px-3 flex flex-col items-center gap-1.5' : 'px-4 flex gap-4 items-center'} md:flex-col md:gap-4 md:px-4 md:text-center sm:px-3 sm:gap-3`}>
        <div className={`${compact ? 'text-xs w-full text-center order-1' : 'hidden'}`} style={{ color: 'var(--light-font-color)' }}>Superhero is Open Source</div>
        <nav className={`${compact ? 'w-full order-2 ml-0 justify-center gap-x-2 gap-y-1' : 'ml-auto'} flex flex-wrap ${compact ? '' : 'gap-3'} md:ml-0 md:order-1 md:justify-center md:gap-2 sm:gap-1.5`}>
          <Link
            to="/terms"
            className={`no-underline min-h-0 ${compact ? 'text-xs py-0.5 px-2' : 'text-sm py-1.5 px-3'} rounded-lg transition-all duration-200 whitespace-nowrap md:text-[13px] md:py-1.5 md:px-2.5 sm:text-xs sm:py-1 sm:px-2`}
            style={{ color: 'var(--light-font-color)' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = 'var(--custom-links-color)';
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = 'var(--light-font-color)';
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent';
            }}
          >
            Terms of Use
          </Link>
          <Link
            to="/privacy"
            className={`no-underline min-h-0 ${compact ? 'text-xs py-0.5 px-2' : 'text-sm py-1.5 px-3'} rounded-lg transition-all duration-200 whitespace-nowrap md:text-[13px] md:py-1.5 md:px-2.5 sm:text-xs sm:py-1 sm:px-2`}
            style={{ color: 'var(--light-font-color)' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = 'var(--custom-links-color)';
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.color = 'var(--light-font-color)';
              (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent';
            }}
          >
            Privacy Policy
          </Link>
          <a
            href="https://github.com/superhero-com/superhero"
            target="_blank"
            rel="noreferrer"
            className={`no-underline min-h-0 ${compact ? 'text-xs py-0.5 px-2' : 'text-sm py-1.5 px-3'} rounded-lg transition-all duration-200 whitespace-nowrap md:text-[13px] md:py-1.5 md:px-2.5 sm:text-xs sm:py-1 sm:px-2`}
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
        <div className={`${compact ? 'hidden' : 'text-sm'} md:order-2 md:text-[13px]`} style={{ color: 'var(--light-font-color)' }}>Superhero is Open Source</div>
      </div>
      <div className={`max-w-[min(1400px,100%)] mx-auto ${compact ? 'px-3' : 'px-4'} mt-2 flex ${compact ? 'justify-center' : 'justify-end'} md:justify-center md:px-4 sm:px-3`}>
        <div className={`bg-white/[0.02] border border-white/[0.06] rounded-lg ${compact ? 'px-2 py-2' : 'px-3 py-2'} shadow-sm`}>
          <div className={`${compact ? 'text-[10px]' : 'text-[11px]'} text-[var(--light-font-color)] uppercase tracking-wide mb-1 text-center`}>Status</div>
          <div className={`grid grid-cols-2 gap-x-3 gap-y-1 ${compact ? 'text-xs' : 'text-sm'} md:text-[13px] sm:text-xs`}>
            <span style={{ color: isOnline ? 'var(--neon-green)' : 'var(--neon-pink)' }}>
              {isOnline ? '🟢 Blockchain' : '🔴 Blockchain'}
            </span>
            <span style={{ color: statusColor(apiStatus.backend) }}>
              {`${statusEmoji(apiStatus.backend)} Backend`}
            </span>
          </div>
        </div>
      </div>
      {/* Send Feedback button (very bottom) */}
      <div className={`max-w-[min(1400px,100%)] mx-auto ${compact ? 'px-3' : 'px-4'} mt-6 flex ${compact ? 'justify-center' : 'justify-end'} md:justify-center md:px-4 sm:px-3`}>
        <a
          href="https://github.com/superhero-com/superhero/issues"
          target="_blank"
          rel="noreferrer"
          className="no-underline inline-flex items-center gap-2 font-semibold rounded-full px-4 py-2 transition-all duration-200 hover:translate-y-[-1px] active:translate-y-0 focus:outline-none focus:shadow-[0_10px_24px_rgba(0,0,0,0.25)]"
          style={{
            background: 'linear-gradient(to right, var(--neon-teal), var(--neon-teal), #5eead4)',
            color: '#0a0a0f',
            WebkitTextFillColor: '#0a0a0f',
            backgroundClip: 'padding-box',
            WebkitBackgroundClip: 'padding-box'
          }}
          aria-label="Send Feedback on GitHub"
        >
          <span className="text-lg" style={{ color: '#0a0a0f', WebkitTextFillColor: '#0a0a0f' }} aria-hidden="true">💬</span>
          <span className={compact ? 'text-sm' : 'text-base'} style={{ color: '#0a0a0f', WebkitTextFillColor: '#0a0a0f' }}>Send Feedback</span>
        </a>
      </div>
      {/* No BackToTop in footer; it is rendered inside the right rail only */}
    </footer>
  );
}


