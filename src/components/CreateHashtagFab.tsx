import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSectionTheme } from './layout/AppLayout';
import { useTheme } from '@/contexts/ThemeContext';

export default function CreateHashtagFab() {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { colors } = useSectionTheme();
  const { isDark } = useTheme();

  // Only show on home and trends pages
  const shouldShowOnPage = location.pathname === '/' || location.pathname.startsWith('/trends');

  useEffect(() => {
    if (!shouldShowOnPage) {
      setIsVisible(false);
      return;
    }

    const handleScroll = () => {
      // Show FAB after scrolling 300px (when hero button is likely out of view)
      const scrollThreshold = 300;
      setIsVisible(window.scrollY > scrollThreshold);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Check initial position

    return () => window.removeEventListener('scroll', handleScroll);
  }, [shouldShowOnPage]);

  const handleClick = () => {
    navigate('/trends/create');
  };

  if (!shouldShowOnPage) return null;

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        fixed bottom-6 right-6 z-50 
        flex items-center gap-2.5
        rounded-2xl
        shadow-2xl
        transition-all duration-500 ease-out
        hover:scale-105 active:scale-95
        ${isVisible 
          ? 'translate-y-0 opacity-100' 
          : 'translate-y-20 opacity-0 pointer-events-none'
        }
      `}
      style={{
        background: colors.gradient,
        padding: isHovered ? '18px 28px' : '18px 22px',
        boxShadow: `0 10px 40px ${colors.primary}50, 0 0 0 ${isHovered ? '4px' : '0px'} ${colors.primaryLight}40`,
      }}
      aria-label="Create a Hashtag"
      title="Create a Hashtag"
    >
      {/* Animated glow ring */}
      <div 
        className="absolute inset-0 rounded-2xl animate-pulse opacity-50"
        style={{
          background: colors.gradient,
          filter: 'blur(8px)',
          zIndex: -1,
        }}
      />
      
      {/* Hashtag Icon with animation */}
      <div className={`relative transition-transform duration-300 ${isHovered ? 'rotate-12 scale-110' : ''}`}>
        <svg 
          className="w-7 h-7" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          style={{ color: isDark ? '#0f172a' : '#ffffff' }}
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2.5} 
            d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" 
          />
        </svg>
        {/* Plus indicator */}
        <div 
          className={`
            absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full 
            flex items-center justify-center
            transition-all duration-300
            ${isHovered ? 'scale-110' : 'scale-100'}
          `}
          style={{ 
            background: isDark ? '#0f172a' : '#ffffff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}
        >
          <svg 
            className="w-2.5 h-2.5" 
            fill="none" 
            stroke={colors.primary}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
          </svg>
        </div>
      </div>

      {/* Text - expands on hover */}
      <span 
        className={`
          font-bold text-base whitespace-nowrap overflow-hidden
          transition-all duration-300 ease-out
          ${isHovered ? 'max-w-[150px] opacity-100' : 'max-w-0 opacity-0'}
        `}
        style={{ color: isDark ? '#0f172a' : '#ffffff' }}
      >
        Create Hashtag
      </span>
    </button>
  );
}

