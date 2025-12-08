import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { GlassSurface } from '../ui/GlassSurface';

interface TabItem {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface TabSwitcherProps {
  items: TabItem[];
  className?: string;
}

export default function TabSwitcher({ items, className }: TabSwitcherProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const isActiveRoute = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <GlassSurface className={`mb-6 w-full ${className || ''}`} interactive={false}>
      <div className="flex flex-row items-center gap-1.5 p-1.5">
        {items.map((item) => {
          const isActive = isActiveRoute(item.path);
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex flex-row items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl text-[10px] font-bold transition-all duration-200 cursor-pointer border-none whitespace-nowrap ${
                isActive
                  ? 'bg-white/10 text-white shadow-inner'
                  : 'bg-transparent text-white/40 hover:text-white/80 hover:bg-white/5'
              }`}
              title={item.label}
            >
              <div className={`transition-colors duration-200 flex-shrink-0 ${isActive ? 'text-[var(--neon-teal)]' : 'text-current'}`}>
                {item.icon}
              </div>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </GlassSurface>
  );
}

