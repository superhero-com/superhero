import React, { forwardRef } from 'react';
import AppSelect, { Item as AppSelectItem } from '@/components/inputs/AppSelect';
import { cn } from '../lib/utils';

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

interface MobileInputProps extends BaseMobileInputProps, Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  as?: 'input';
}

interface MobileSelectProps extends BaseMobileInputProps, Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
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

    const baseInputClasses = cn(
      // Base styles
      'w-full font-inherit transition-all duration-200 outline-none',
      'appearance-none touch-manipulation rounded-xl',
      // Focus styles
      'focus:ring-2 focus:ring-green-500/20 focus:border-green-500',
      // Hover styles
      'hover:border-white/30',
      // Disabled styles
      'disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-white/5',
      // Placeholder styles
      'placeholder:text-white/50',
      // Size variants
      size === 'small' && 'h-10 text-sm px-3',
      size === 'medium' && 'h-12 text-base px-4',
      size === 'large' && 'h-14 text-lg px-5',
      // Mobile adjustments
      'sm:h-11 sm:px-3 md:h-12 md:px-4',
      // Variant styles
      variant === 'default' && 'bg-[var(--secondary-color)] border border-[var(--search-nav-border-color)] text-[var(--standard-font-color)]',
      variant === 'filled' && 'bg-white/5 border border-transparent text-white focus:bg-white/8',
      variant === 'outlined' && 'bg-transparent border-2 border-white/20 text-white focus:bg-green-500/5',
      // Error state
      error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
      // Icon padding adjustments
      leftIcon && 'pl-14 sm:pl-13',
      rightIcon && 'pr-14 sm:pr-13',
    );

    const iconClasses = cn(
      'absolute flex items-center justify-center text-white/60 pointer-events-none z-10 min-w-6 text-center',
    );
    const selectValue = (
      props as React.SelectHTMLAttributes<HTMLSelectElement>
    ).value as string | undefined;
    const handleSelectChange = (value: string) => {
      (props as any).onChange?.({ target: { value } } as any);
    };

    return (
      <div className={cn('flex flex-col gap-2 w-full', className)}>
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              'text-sm font-medium mb-1 text-[var(--standard-font-color)]',
              'sm:text-xs',
              // Focus-within color change
              'peer-focus-within:text-green-500',
              error && 'text-red-500',
            )}
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center w-full peer">
          {leftIcon && (
            <div className={cn(iconClasses, 'left-5 sm:left-4')}>
              {leftIcon}
            </div>
          )}

          {as === 'select' ? (
            <AppSelect
              value={selectValue}
              onValueChange={handleSelectChange}
              triggerClassName={baseInputClasses}
            >
              {React.Children.map(children, (child) => {
                if (!React.isValidElement(child)) return null;
                const value = (child.props as any).value ?? (child.props as any).children;
                return (
                  <AppSelectItem key={value} value={String(value)}>
                    {(child.props as any).children}
                  </AppSelectItem>
                );
              })}
            </AppSelect>
          ) : (
            <input
              ref={ref as React.Ref<HTMLInputElement>}
              id={inputId}
              className={baseInputClasses}
              style={{ fontSize: '16px' }} // Prevent zoom on iOS
              {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
            />
          )}

          {rightIcon && (
            <div className={cn(iconClasses, 'right-5 sm:right-4')}>
              {rightIcon}
            </div>
          )}
        </div>

        {(error || helperText) && (
          <div className={cn(
            'text-xs leading-relaxed sm:text-xs',
            error ? 'text-red-500' : 'text-white/60',
          )}
          >
            {error || helperText}
          </div>
        )}
      </div>
    );
  },
);

MobileInput.displayName = 'MobileInput';

export default MobileInput;
