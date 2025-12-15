import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function Tab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 rounded-xl border transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] min-h-[48px] touch-manipulation uppercase tracking-wider font-semibold text-sm
                  md:px-4 md:py-2.5 md:min-h-[44px] md:text-xs
                  sm:px-3 sm:py-2 sm:min-h-[40px] sm:text-[10px]
                  ${active 
                    ? 'text-white border-transparent shadow-lg hover:-translate-y-0.5'
                    : 'text-[var(--light-font-color)] border-transparent hover:text-[var(--standard-font-color)] hover:-translate-y-0.5 hover:shadow-lg'
                  }`}
      style={{
        background: active ? 'var(--button-gradient)' : 'var(--secondary-gradient)',
        boxShadow: active ? 'var(--button-shadow)' : 'inset 0 2px 4px rgba(0, 0, 0, 0.1)',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.1)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = active ? 'var(--button-shadow)' : 'inset 0 2px 4px rgba(0, 0, 0, 0.1)';
      }}
    >
      {label}
    </button>
  );
}

export default function DexTabs() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  const isDex = path.startsWith('/apps');
  const isPool = path.startsWith('/pool');
  const isExplore = path.startsWith('/explore');

  return (
    <div className="flex gap-3 mb-6 items-center flex-wrap justify-center md:gap-2 md:mb-5 sm:gap-1.5 sm:mb-4">
      <Tab label="DeFi" active={isDex} onClick={() => navigate('/apps')} />
      <Tab label="Pool" active={isPool} onClick={() => navigate('/pool')} />
      <Tab label="Explore" active={isExplore} onClick={() => navigate('/explore')} />
      <div className="ml-auto" />
      <button
        onClick={() => navigate('/pool/add-tokens')}
        className="px-6 py-3 rounded-xl border border-transparent transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] min-h-[48px] touch-manipulation uppercase tracking-wider font-semibold text-sm text-[var(--light-font-color)]
                   md:px-4 md:py-2.5 md:min-h-[44px] md:text-xs
                   sm:px-3 sm:py-2 sm:min-h-[40px] sm:text-[10px]
                   hover:text-[var(--standard-font-color)] hover:-translate-y-0.5 hover:shadow-lg"
        style={{
          background: 'var(--secondary-gradient)',
          boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.1)';
        }}
      >
        Add tokens
      </button>
    </div>
  );
}


