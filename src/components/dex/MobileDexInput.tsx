import React, { forwardRef } from 'react';
import Spinner from '../Spinner';

interface DexInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  type?: 'text' | 'number' | 'password';
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'filled' | 'outlined';
  size?: 'small' | 'medium' | 'large';
  maxLength?: number;
  min?: string;
  max?: string;
  step?: string;
  autoFocus?: boolean;
  className?: string;
  inputMode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search';
}

const DexInput = forwardRef<HTMLInputElement, DexInputProps>(({
  label,
  placeholder,
  value,
  onChange,
  onBlur,
  onFocus,
  type = 'text',
  disabled = false,
  loading = false,
  error,
  helperText,
  leftIcon,
  rightIcon,
  variant = 'default',
  size = 'medium',
  maxLength,
  min,
  max,
  step,
  autoFocus = false,
  className = '',
  inputMode,
}, ref) => {
  // Base container classes
  const containerClasses = `flex flex-col gap-2 ${disabled ? 'opacity-50 pointer-events-none' : ''} ${className}`.trim();
  
  // Input field classes based on variant, size, and state
  const getInputClasses = () => {
    const baseClasses = 'w-full rounded-xl font-medium transition-all duration-200 outline-none touch-auto';
    
    // Size-based classes
    const sizeClasses = {
      small: `px-3 py-2 text-sm min-h-[40px] ${leftIcon ? 'pl-12' : ''} ${rightIcon ? 'pr-10' : ''}`,
      medium: `px-4 py-3 text-base min-h-[48px] sm:min-h-[52px] ${leftIcon ? 'pl-14' : ''} ${rightIcon ? 'pr-12' : ''}`,
      large: `px-5 py-4 text-lg min-h-[56px] sm:min-h-[60px] ${leftIcon ? 'pl-16' : ''} ${rightIcon ? 'pr-14' : ''}`
    };
    
    // Variant-based styling
    let variantStyles = '';
    if (variant === 'filled') {
      variantStyles = 'border border-[rgba(var(--primary-color-rgb),0.2)]';
    } else if (variant === 'outlined') {
      variantStyles = 'bg-transparent border';
    } else {
      variantStyles = 'border';
    }
    
    // State-based styling
    let stateStyles = '';
    if (error) {
      stateStyles = 'border-[var(--error-color)] focus:border-[var(--error-color)] focus:shadow-[0_0_0_3px_rgba(var(--error-color-rgb),0.1)]';
    } else {
      stateStyles = 'focus:border-[var(--primary-color)] focus:shadow-[0_0_0_3px_rgba(var(--primary-color-rgb),0.1)]';
    }
    
    if (disabled || loading) {
      stateStyles += ' opacity-50 cursor-not-allowed';
    }
    
    return `${baseClasses} ${sizeClasses[size]} ${variantStyles} ${stateStyles}`.trim();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled && !loading) {
      onChange(e.target.value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent multiple decimal points for number inputs
    if (type === 'number' && e.key === '.' && value.includes('.')) {
      e.preventDefault();
    }
  };

  return (
    <div className={containerClasses}>
      {label && (
        <label className="text-sm font-medium text-[var(--light-font-color)] m-0 sm:text-[13px]">
          {label}
        </label>
      )}
      
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3 flex items-center justify-center text-[var(--secondary-font-color)] pointer-events-none z-10 w-6 h-6">
            <div className="w-5 h-5 flex items-center justify-center">
              {leftIcon}
            </div>
          </div>
        )}
        
        <input
          ref={ref}
          type={type}
          value={value}
          onChange={handleChange}
          onBlur={onBlur}
          onFocus={onFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || loading}
          maxLength={maxLength}
          min={min}
          max={max}
          step={step}
          autoFocus={autoFocus}
          inputMode={inputMode}
          className={getInputClasses()}
          style={{
            backgroundColor: variant === 'filled' ? 'rgba(var(--primary-color-rgb), 0.05)' : 
                           variant === 'outlined' ? 'transparent' : 'var(--card-bg-color)',
            borderColor: error ? 'var(--error-color)' : 
                        variant === 'filled' ? 'rgba(var(--primary-color-rgb), 0.2)' : 'var(--border-color)',
            color: 'var(--light-font-color)',
            fontSize: size === 'small' ? '14px' : size === 'large' ? '18px' : '16px'
          }}
        />
        
        {rightIcon && (
          <div className="absolute right-3 flex items-center justify-center text-[var(--secondary-font-color)] pointer-events-none w-6 h-6">
            <div className="w-5 h-5 flex items-center justify-center">
              {rightIcon}
            </div>
          </div>
        )}
        
        {loading && (
          <div className="absolute right-3 flex items-center justify-center pointer-events-none">
            <Spinner className="w-4 h-4" />
          </div>
        )}
      </div>
      
      {(error || helperText) && (
        <div className={`text-xs m-0 sm:text-[11px] ${error ? 'text-[var(--error-color)]' : 'text-[var(--secondary-font-color)]'}`}>
          {error || helperText}
        </div>
      )}
    </div>
  );
});

DexInput.displayName = 'DexInput';

export default DexInput;
