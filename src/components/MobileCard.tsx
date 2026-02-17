import React from 'react';
import { cn } from '../lib/utils';

interface MobileCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'filled';
  padding?: 'none' | 'small' | 'medium' | 'large';
  clickable?: boolean;
  loading?: boolean;
  shadow?: boolean;
}

const MobileCard: React.FC<MobileCardProps> = ({
  children,
  variant = 'default',
  padding = 'medium',
  clickable = false,
  loading = false,
  shadow = true,
  className = '',
  ...props
}) => (
  <div
    className={cn(
      // Base styles
      'relative overflow-hidden transition-all duration-200 touch-manipulation',
      'rounded-2xl sm:rounded-xl',
      // Variant styles
      variant === 'default' && 'bg-[var(--secondary-color)] border border-white/10',
      variant === 'elevated' && 'bg-[var(--secondary-color)] border-none',
      variant === 'outlined' && 'bg-transparent border-2 border-white/20',
      variant === 'filled' && 'bg-white/5 border border-white/10',
      // Shadow styles
      shadow && variant !== 'elevated' && 'shadow-[0_2px_8px_rgba(0,0,0,0.1)]',
      variant === 'elevated' && 'shadow-[0_4px_20px_rgba(0,0,0,0.15)]',
      // Clickable styles
      clickable && [
        'cursor-pointer select-none',
        'hover:-translate-y-0.5',
        'active:translate-y-0 active:shadow-[0_4px_15px_rgba(0,0,0,0.15)]',
        'focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_rgba(17,97,254,0.35)]',
        'min-h-12', // Better touch target
      ],
      // Loading state
      loading && 'pointer-events-none',
      className,
    )}
    {...props}
  >
    {loading && (
    <div className="absolute inset-0 bg-white/5 flex items-center justify-center z-10">
      <div className="w-full h-full bg-gradient-to-r from-white/10 via-white/20 to-white/10 bg-[length:200%_100%] animate-[skeleton-loading_1.5s_infinite] rounded-lg" />
    </div>
    )}
    <div
      className={cn(
        'relative z-[1]',
        // Padding variants
        padding === 'none' && 'p-0',
        padding === 'small' && 'p-3 sm:p-2.5',
        padding === 'medium' && 'p-4 sm:p-3.5',
        padding === 'large' && 'p-6 sm:p-5',
        // Loading opacity
        loading && 'opacity-60',
      )}
    >
      {children}
    </div>
  </div>
);

export default MobileCard;
