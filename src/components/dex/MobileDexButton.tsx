import React from 'react';
import Spinner from '../Spinner';

interface DexButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
}

export default function DexButton({
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  type = 'button',
  leftIcon,
  rightIcon,
  className = '',
}: DexButtonProps) {
  // Base button classes
  const baseClasses = 'inline-flex items-center justify-center gap-2 border-none rounded-xl font-semibold cursor-pointer transition-all duration-200 touch-manipulation select-none relative';
  
  // Size classes
  const sizeClasses = {
    small: 'px-3 py-2 text-sm min-h-[40px] md:px-2.5 md:py-1.5 md:text-xs md:min-h-[36px]',
    medium: 'px-4 py-3 text-base min-h-[48px] md:px-3 md:py-2 md:text-sm md:min-h-[44px]',
    large: 'px-6 py-4 text-lg min-h-[56px] md:px-4 md:py-3 md:text-base md:min-h-[52px]'
  };
  
  // Full width class
  const widthClass = fullWidth ? 'w-full' : '';
  
  // Disabled/loading classes
  const stateClasses = (disabled || loading) ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-0.5 active:translate-y-0';
  
  const buttonClasses = `${baseClasses} ${sizeClasses[size]} ${widthClass} ${stateClasses} ${className}`.trim();

  const handleClick = () => {
    if (!disabled && !loading && onClick) {
      onClick();
    }
  };

  // Get variant styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: 'var(--primary-color)',
          color: 'white'
        };
      case 'secondary':
        return {
          backgroundColor: 'var(--secondary-color)',
          color: 'white'
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: 'var(--primary-color)',
          border: '2px solid var(--primary-color)'
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: 'var(--light-font-color)'
        };
      case 'danger':
        return {
          backgroundColor: 'var(--error-color)',
          color: 'white'
        };
      default:
        return {};
    }
  };

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={handleClick}
      disabled={disabled || loading}
      style={getVariantStyles()}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          switch (variant) {
            case 'primary':
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(var(--primary-color-rgb), 0.3)';
              break;
            case 'outline':
              e.currentTarget.style.backgroundColor = 'rgba(var(--primary-color-rgb), 0.1)';
              break;
            case 'ghost':
              e.currentTarget.style.backgroundColor = 'rgba(var(--light-font-color-rgb), 0.1)';
              break;
          }
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !loading) {
          const variantStyles = getVariantStyles();
          e.currentTarget.style.backgroundColor = variantStyles.backgroundColor || '';
          e.currentTarget.style.boxShadow = '';
        }
      }}
    >
      {loading && (
        <div className="flex items-center justify-center">
          <Spinner className="w-4 h-4" />
        </div>
      )}
      
      {!loading && leftIcon && (
        <div className="flex items-center justify-center w-5 h-5">
          {leftIcon}
        </div>
      )}
      
      <span className="flex items-center">
        {children}
      </span>
      
      {!loading && rightIcon && (
        <div className="flex items-center justify-center w-5 h-5">
          {rightIcon}
        </div>
      )}
    </button>
  );
}
