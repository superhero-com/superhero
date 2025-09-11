import * as React from "react"
import { cn } from "@/lib/utils"

const AeCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "glass" | "gradient" | "glow"
    hover?: boolean
  }
>(({ className, variant = "default", hover = true, ...props }, ref) => {
  const baseClasses = "rounded-2xl border text-card-foreground transition-all duration-300 ease-out relative overflow-hidden"
  
  const variantClasses = {
    default: "bg-card border-border shadow-card",
    glass: "bg-glass-bg backdrop-blur-card border-glass-border shadow-glass",
    gradient: "bg-card-gradient border-border shadow-card",
    glow: "bg-card border-border shadow-glow"
  }
  
  const hoverClasses = hover ? "hover:-translate-y-1 hover:shadow-glow" : ""
  
  return (
    <div
      ref={ref}
      className={cn(
        baseClasses,
        variantClasses[variant],
        hoverClasses,
        className
      )}
      style={{
        background: variant === "glass" ? 
          "radial-gradient(1200px 400px at -20% -40%, rgba(255,255,255,0.06), transparent 40%), rgba(255, 255, 255, 0.03)" :
          variant === "gradient" ? 
          "var(--card-gradient)" :
          undefined,
        backdropFilter: variant === "glass" ? "blur(12px)" : undefined,
        WebkitBackdropFilter: variant === "glass" ? "blur(12px)" : undefined,
        ...props.style
      }}
      {...props}
    />
  )
})
AeCard.displayName = "AeCard"

const AeCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
AeCardHeader.displayName = "AeCardHeader"

const AeCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight bg-primary-gradient bg-clip-text text-transparent",
      className
    )}
    {...props}
  />
))
AeCardTitle.displayName = "AeCardTitle"

const AeCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
AeCardDescription.displayName = "AeCardDescription"

const AeCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
AeCardContent.displayName = "AeCardContent"

const AeCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
AeCardFooter.displayName = "AeCardFooter"

export { AeCard, AeCardHeader, AeCardFooter, AeCardTitle, AeCardDescription, AeCardContent }
