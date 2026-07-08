import * as React from 'react';
import { cn } from '@/lib/utils';

const AeCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: 'default' | 'glass' | 'gradient' | 'glow' | 'glow-bull' | 'glow-bear'
    hover?: boolean
  }
>(({
  className, variant = 'default', hover = true, ...props
}, ref) => {
  const baseClasses = 'rounded-xl border text-card-foreground transition-all duration-300 ease-out relative overflow-hidden';

  const variantClasses = {
    default: 'bg-card border-border shadow-card',
    glass: 'bg-glass-bg backdrop-blur-card border border-white/10 shadow-glass',
    gradient: 'bg-card-gradient border-border shadow-card',
    glow: 'bg-card border-border shadow-glow',
    'glow-bull': 'bg-card border-bull/40 shadow-glow-bull',
    'glow-bear': 'bg-card border-bear/40 shadow-glow-bear',
  };

  const hoverClasses = hover ? 'hover:-translate-y-1' : '';

  let background: string | undefined;
  if (variant === 'glass') {
    // Liquid glass: corner specular + top sheen over the translucent fill.
    background = 'radial-gradient(130% 90% at 12% -12%, rgba(255,255,255,0.12), transparent 46%), linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0) 55%), var(--glass-bg)';
  } else if (variant === 'gradient') {
    background = 'var(--card-gradient)';
  }

  const glassFilter = variant === 'glass' ? 'blur(22px) saturate(180%) brightness(1.06)' : undefined;

  return (
    <div
      ref={ref}
      className={cn(
        baseClasses,
        variantClasses[variant],
        hoverClasses,
        className,
      )}
      style={{
        background,
        backdropFilter: glassFilter,
        WebkitBackdropFilter: glassFilter,
        boxShadow: variant === 'glass' ? 'inset 0 1px 0 0 rgba(255,255,255,0.14), 0 10px 34px rgba(0,0,0,0.30)' : undefined,
        ...props.style,
      }}
      {...props}
    />
  );
});
AeCard.displayName = 'AeCard';

const AeCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6', className)}
    {...props}
  />
));
AeCardHeader.displayName = 'AeCardHeader';

const AeCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-2xl font-semibold leading-none tracking-tight bg-primary-gradient bg-clip-text text-transparent',
      className,
    )}
    {...props}
  >
    {children}
  </h3>
));
AeCardTitle.displayName = 'AeCardTitle';

const AeCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
AeCardDescription.displayName = 'AeCardDescription';

const AeCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
));
AeCardContent.displayName = 'AeCardContent';

const AeCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center p-6 pt-0', className)}
    {...props}
  />
));
AeCardFooter.displayName = 'AeCardFooter';

export {
  AeCard, AeCardHeader, AeCardFooter, AeCardTitle, AeCardDescription, AeCardContent,
};
