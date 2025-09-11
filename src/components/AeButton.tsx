import React from 'react';
import { AeButton as ShadcnAeButton, type AeButtonProps as ShadcnAeButtonProps } from './ui/ae-button';
import { cn } from '@/lib/utils';

export interface AeButtonProps extends Omit<ShadcnAeButtonProps, 'variant' | 'size'> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'ghost' | 'secondary-dark' | 'tab' | 'utility' | 'disabled-token';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'small' | 'medium' | 'large';
  rounded?: boolean;
  outlined?: boolean;
  gradient?: boolean;
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
  ...props
}: AeButtonProps) {
  // Map legacy variants to new shadcn variants
  const variantMap: Record<string, ShadcnAeButtonProps['variant']> = {
    'primary': 'default',
    'secondary': 'secondary',
    'accent': 'accent',
    'success': 'success',
    'warning': 'warning',
    'error': 'error',
    'ghost': 'ghost',
    'secondary-dark': 'secondary',
    'tab': 'tab',
    'utility': 'utility',
    'disabled-token': 'outline',
  };

  // Map legacy sizes to new shadcn sizes
  const sizeMap: Record<string, ShadcnAeButtonProps['size']> = {
    'xs': 'xs',
    'sm': 'sm',
    'md': 'default',
    'lg': 'lg',
    'xl': 'xl',
    'small': 'sm',
    'medium': 'default',
    'large': 'lg',
  };

  const shadcnVariant = variantMap[variant] || 'default';
  const shadcnSize = sizeMap[size] || 'default';

  return (
    <ShadcnAeButton
      variant={shadcnVariant}
      size={shadcnSize}
      disabled={disabled}
      loading={loading}
      fullWidth={fullWidth}
      glow={glow}
      active={active}
      onClick={onClick}
      type={type}
      className={cn(
        rounded && 'rounded-full',
        outlined && 'border-2',
        gradient && 'bg-gradient-to-r',
        className
      )}
      style={style}
      {...props}
    >
      {children}
    </ShadcnAeButton>
  );
}


