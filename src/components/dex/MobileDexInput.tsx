import React, { forwardRef } from 'react';
import './MobileDexInput.scss';

interface MobileDexInputProps {
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

const MobileDexInput = forwardRef<HTMLInputElement, MobileDexInputProps>(({
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
  const inputClasses = [
    'mobile-dex-input',
    `mobile-dex-input--${variant}`,
    `mobile-dex-input--${size}`,
    disabled ? 'mobile-dex-input--disabled' : '',
    loading ? 'mobile-dex-input--loading' : '',
    error ? 'mobile-dex-input--error' : '',
    leftIcon ? 'mobile-dex-input--with-left-icon' : '',
    rightIcon ? 'mobile-dex-input--with-right-icon' : '',
    className,
  ].filter(Boolean).join(' ');

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
    <div className={inputClasses}>
      {label && (
        <label className="mobile-dex-input__label">
          {label}
        </label>
      )}
      
      <div className="mobile-dex-input__wrapper">
        {leftIcon && (
          <div className="mobile-dex-input__left-icon">
            {leftIcon}
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
          className="mobile-dex-input__field"
        />
        
        {rightIcon && (
          <div className="mobile-dex-input__right-icon">
            {rightIcon}
          </div>
        )}
        
        {loading && (
          <div className="mobile-dex-input__loading-indicator">
            <div className="mobile-dex-input__spinner"></div>
          </div>
        )}
      </div>
      
      {(error || helperText) && (
        <div className={`mobile-dex-input__message ${error ? 'mobile-dex-input__message--error' : 'mobile-dex-input__message--helper'}`}>
          {error || helperText}
        </div>
      )}
    </div>
  );
});

MobileDexInput.displayName = 'MobileDexInput';

export default MobileDexInput;
