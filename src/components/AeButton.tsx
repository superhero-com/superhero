import React from 'react';
import './AeButton.scss';

export interface AeButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'ghost' | 'secondary-dark' | 'tab' | 'utility' | 'disabled-token';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  rounded?: boolean;
  outlined?: boolean;
  gradient?: boolean;
  glow?: boolean;
  active?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  style?: React.CSSProperties;
}

export default function AeButton({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  rounded = false,
  outlined = false,
  gradient = false,
  glow = false,
  active = false,
  onClick,
  type = 'button',
  className = '',
  style = {},
}: AeButtonProps) {
  const baseClass = 'ae-button';
  const variantClass = `ae-button--${variant}`;
  const sizeClass = `ae-button--${size}`;
  const stateClass = disabled ? 'ae-button--disabled' : '';
  const loadingClass = loading ? 'ae-button--loading' : '';
  const fullWidthClass = fullWidth ? 'ae-button--full-width' : '';
  const roundedClass = rounded ? 'ae-button--rounded' : '';
  const outlinedClass = outlined ? 'ae-button--outlined' : '';
  const gradientClass = gradient ? 'ae-button--gradient' : '';
  const glowClass = glow ? 'ae-button--glow' : '';
  const activeClass = active ? 'ae-button--active' : '';

  const combinedClassName = [
    baseClass,
    variantClass,
    sizeClass,
    stateClass,
    loadingClass,
    fullWidthClass,
    roundedClass,
    outlinedClass,
    gradientClass,
    glowClass,
    activeClass,
    className
  ].filter(Boolean).join(' ');

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !loading && onClick) {
      onClick(e);
    }
  };

  return (
    <button
      type={type}
      className={combinedClassName}
      disabled={disabled || loading}
      onClick={handleClick}
      style={style}
    >
      {loading && (
        <span className="ae-button__loader">
          <svg className="ae-button__spinner" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeDasharray="31.416" strokeDashoffset="31.416">
              <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite" />
              <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite" />
            </circle>
          </svg>
        </span>
      )}
      <span className="ae-button__content">
        {children}
      </span>
    </button>
  );
}


