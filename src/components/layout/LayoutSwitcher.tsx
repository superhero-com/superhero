import React from 'react';
import { useLayoutVariant, LayoutVariant } from '../../contexts/LayoutVariantContext';
import { GlassSurface } from '../ui/GlassSurface';

export default function LayoutSwitcher({ mode = 'sidebar' }: { mode?: 'sidebar' | 'header' }) {
  const { variant, setVariant } = useLayoutVariant();

  const options: { id: LayoutVariant; label: string; icon: React.ReactNode }[] = [
    {
      id: 'dashboard',
      label: 'Default',
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <rect x="0.5" y="3" width="4" height="10" rx="1" opacity="0.5" />
          <rect x="5.5" y="3" width="5" height="10" rx="1" />
          <rect x="11.5" y="3" width="4" height="10" rx="1" opacity="0.5" />
        </svg>
      )
    },
    {
      id: 'focus',
      label: 'Focus',
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <rect x="1.5" y="3" width="4" height="10" rx="1" opacity="0.5" />
          <rect x="6.5" y="3" width="8" height="10" rx="1" />
        </svg>
      )
    },
    {
      id: 'minimal',
      label: 'Zen',
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <rect x="4" y="3" width="8" height="10" rx="1" />
        </svg>
      )
    }
  ];

  if (mode === 'header') {
    return (
      <GlassSurface className="flex items-center gap-1 p-1 h-9" interactive={false}>
        {options.map((opt) => {
          const isActive = variant === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setVariant(opt.id)}
              className={`flex items-center justify-center p-1.5 rounded-md transition-all duration-200 cursor-pointer border-none ${
                isActive
                  ? 'bg-white/10 text-[var(--neon-teal)] shadow-sm'
                  : 'bg-transparent text-white/40 hover:text-white/80 hover:bg-white/5'
              }`}
              title={opt.label}
            >
              {opt.icon}
            </button>
          );
        })}
      </GlassSurface>
    );
  }

  return (
    <GlassSurface className="mb-6 w-full" interactive={false}>
      <div className="flex flex-row items-center gap-1.5 p-1.5">
        {options.map((opt) => {
          const isActive = variant === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setVariant(opt.id)}
              className={`flex flex-row items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl text-[10px] font-bold transition-all duration-200 cursor-pointer border-none whitespace-nowrap ${
                isActive
                  ? 'bg-white/10 text-white shadow-inner'
                  : 'bg-transparent text-white/40 hover:text-white/80 hover:bg-white/5'
              }`}
              title={opt.label}
            >
              <div className={`transition-colors duration-200 flex-shrink-0 ${isActive ? 'text-[var(--neon-teal)]' : 'text-current'}`}>
                {opt.icon}
              </div>
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    </GlassSurface>
  );
}
