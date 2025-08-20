import React, { forwardRef } from 'react';
import './MobileInput.scss';

interface BaseMobileInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'filled' | 'outlined';
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

interface MobileInputProps extends BaseMobileInputProps, React.InputHTMLAttributes<HTMLInputElement> {
  as?: 'input';
}

interface MobileSelectProps extends BaseMobileInputProps, React.SelectHTMLAttributes<HTMLSelectElement> {
  as: 'select';
  children: React.ReactNode;
}

type MobileInputComponentProps = MobileInputProps | MobileSelectProps;

const MobileInput = forwardRef<HTMLInputElement | HTMLSelectElement, MobileInputComponentProps>(
  ({ 
    label, 
    error, 
    helperText, 
    leftIcon, 
    rightIcon, 
    variant = 'default', 
    size = 'medium',
    className = '',
    as = 'input',
    children,
    ...props 
  }, ref) => {
    const inputId = React.useId();
    
    return (
      <div className={`mobile-input ${variant} ${size} ${error ? 'error' : ''} ${className}`}>
        {label && (
          <label htmlFor={inputId} className="mobile-input-label">
            {label}
          </label>
        )}
        
        <div className="mobile-input-wrapper">
          {leftIcon && (
            <div className="mobile-input-icon left">
              {leftIcon}
            </div>
          )}
          
          {as === 'select' ? (
            <select
              ref={ref as React.Ref<HTMLSelectElement>}
              id={inputId}
              className="mobile-input-field"
              {...(props as React.SelectHTMLAttributes<HTMLSelectElement>)}
            >
              {children}
            </select>
          ) : (
            <input
              ref={ref as React.Ref<HTMLInputElement>}
              id={inputId}
              className="mobile-input-field"
              {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
            />
          )}
          
          {rightIcon && (
            <div className="mobile-input-icon right">
              {rightIcon}
            </div>
          )}
        </div>
        
        {(error || helperText) && (
          <div className={`mobile-input-message ${error ? 'error' : 'helper'}`}>
            {error || helperText}
          </div>
        )}
      </div>
    );
  }
);

MobileInput.displayName = 'MobileInput';

export default MobileInput;
