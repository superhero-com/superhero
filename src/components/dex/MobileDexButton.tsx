import React from 'react';
import './MobileDexButton.scss';

interface MobileDexButtonProps {
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

export default function MobileDexButton({
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
}: MobileDexButtonProps) {
  const buttonClasses = [
    'mobile-dex-button',
    `mobile-dex-button--${variant}`,
    `mobile-dex-button--${size}`,
    fullWidth ? 'mobile-dex-button--full-width' : '',
    disabled ? 'mobile-dex-button--disabled' : '',
    loading ? 'mobile-dex-button--loading' : '',
    leftIcon ? 'mobile-dex-button--with-left-icon' : '',
    rightIcon ? 'mobile-dex-button--with-right-icon' : '',
    className,
  ].filter(Boolean).join(' ');

  const handleClick = () => {
    if (!disabled && !loading && onClick) {
      onClick();
    }
  };

  return (
    <button
      type={type}
      className={buttonClasses}
      onClick={handleClick}
      disabled={disabled || loading}
    >
      {loading && (
        <div className="mobile-dex-button__loading">
          <div className="mobile-dex-button__spinner"></div>
        </div>
      )}
      
      {!loading && leftIcon && (
        <div className="mobile-dex-button__left-icon">
          {leftIcon}
        </div>
      )}
      
      <span className="mobile-dex-button__content">
        {children}
      </span>
      
      {!loading && rightIcon && (
        <div className="mobile-dex-button__right-icon">
          {rightIcon}
        </div>
      )}
    </button>
  );
}
