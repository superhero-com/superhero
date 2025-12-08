import React, { CSSProperties, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface GlassSurfaceProps extends Omit<HTMLAttributes<HTMLDivElement>, 'style'> {
  children: React.ReactNode;
  className?: string;
  style?: CSSProperties;
  variant?: 'default' | 'subtle' | 'strong';
  interactive?: boolean;
}

/**
 * GlassSurface component inspired by reactbits.dev
 * Provides a beautiful frosted glass effect with optional interactivity
 */
export function GlassSurface({
  children,
  className,
  style,
  variant = 'default',
  interactive = true,
  ...props
}: GlassSurfaceProps) {
  const variantStyles = {
    default: {
      background: 'rgba(255, 255, 255, 0.02)',
      borderColor: 'rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(24px)',
    },
    subtle: {
      background: 'rgba(255, 255, 255, 0.01)',
      borderColor: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(16px)',
    },
    strong: {
      background: 'rgba(255, 255, 255, 0.05)',
      borderColor: 'rgba(255, 255, 255, 0.12)',
      backdropFilter: 'blur(32px)',
    },
  };

  const baseStyle: CSSProperties = {
    position: 'relative',
    background: variantStyles[variant].background,
    border: `1px solid ${variantStyles[variant].borderColor}`,
    borderRadius: '24px',
    backdropFilter: variantStyles[variant].backdropFilter,
    WebkitBackdropFilter: variantStyles[variant].backdropFilter,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    overflow: 'hidden',
    transition: interactive
      ? 'all 0.4s cubic-bezier(0.25, 1, 0.5, 1)'
      : 'none',
    ...style,
  };

  return (
    <div
      className={cn('glass-surface', interactive && 'cursor-pointer', className)}
      style={baseStyle}
      {...props}
    >
      {/* Prismatic edge effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          borderRadius: 'inherit',
          padding: '1px',
          background: `linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.1),
            rgba(255, 255, 255, 0.05) 20%,
            rgba(0, 255, 255, 0.25) 40%,
            rgba(255, 0, 255, 0.25) 60%,
            rgba(255, 255, 255, 0.05) 80%,
            rgba(255, 255, 255, 0.1)
          )`,
          backgroundSize: '200% 200%',
          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
          animation: 'holographic-shift 6s ease infinite',
          opacity: 0.6,
          zIndex: -1,
        }}
      />
      
      {/* Content wrapper */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default GlassSurface;

