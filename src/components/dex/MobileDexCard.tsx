import React from 'react';

interface DexCardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'filled';
  padding?: 'small' | 'medium' | 'large';
  clickable?: boolean;
  onClick?: () => void;
  loading?: boolean;
  className?: string;
}

export default function DexCard({
  title,
  subtitle,
  children,
  variant = 'default',
  padding = 'medium',
  clickable = false,
  onClick,
  loading = false,
  className = '',
}: DexCardProps) {
  // Base card classes
  const baseClasses = 'border rounded-xl transition-all duration-200 overflow-hidden mb-4 sm:mb-3';
  
  // Padding classes
  const paddingClasses = {
    small: 'p-3',
    medium: 'p-4 md:p-5 sm:p-4',
    large: 'p-5 md:p-6 sm:p-5'
  };
  
  // Clickable classes
  const clickableClasses = clickable 
    ? 'cursor-pointer select-none touch-manipulation hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:shadow-md min-h-[48px]'
    : '';
  
  // Loading classes
  const loadingClasses = loading ? 'pointer-events-none opacity-70' : '';
  
  const cardClasses = `${baseClasses} ${paddingClasses[padding]} ${clickableClasses} ${loadingClasses} ${className}`.trim();

  const handleClick = () => {
    if (clickable && onClick && !loading) {
      onClick();
    }
  };

  return (
    <div 
      className={cardClasses} 
      onClick={handleClick}
      style={{
        backgroundColor: variant === 'filled' ? 'var(--primary-color)' :
                        variant === 'outlined' ? 'transparent' :
                        variant === 'elevated' ? 'var(--card-bg-color)' : 'var(--dark-bg-color)',
        borderColor: variant === 'filled' ? 'var(--primary-color)' : 'var(--border-color)',
        color: variant === 'filled' ? 'white' : 'inherit',
        boxShadow: variant === 'elevated' ? '0 4px 12px rgba(0, 0, 0, 0.15)' : undefined
      }}
    >
      {(title || subtitle) && (
        <div className="mb-4 sm:mb-3">
          {title && (
            <h3 className="text-lg font-bold m-0 mb-1 text-[var(--light-font-color)] sm:text-base">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm m-0 opacity-80 text-[var(--secondary-font-color)] sm:text-[13px]">
              {subtitle}
            </p>
          )}
        </div>
      )}
      <div>
        {loading ? (
          <div className="flex flex-col gap-3">
            <div className="h-4 rounded w-3/5 animate-pulse" style={{ 
              background: 'linear-gradient(90deg, var(--border-color) 25%, var(--card-bg-color) 50%, var(--border-color) 75%)',
              backgroundSize: '200% 100%'
            }}></div>
            <div className="h-4 rounded w-4/5 animate-pulse" style={{ 
              background: 'linear-gradient(90deg, var(--border-color) 25%, var(--card-bg-color) 50%, var(--border-color) 75%)',
              backgroundSize: '200% 100%'
            }}></div>
            <div className="h-4 rounded w-full animate-pulse" style={{ 
              background: 'linear-gradient(90deg, var(--border-color) 25%, var(--card-bg-color) 50%, var(--border-color) 75%)',
              backgroundSize: '200% 100%'
            }}></div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
