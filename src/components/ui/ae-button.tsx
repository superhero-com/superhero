import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const aeButtonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-semibold ring-offset-background transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary-gradient text-white shadow-button hover:shadow-glow hover:-translate-y-1 hover:scale-105 active:translate-y-0 active:scale-100",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary-gradient text-white shadow-button hover:shadow-glow hover:-translate-y-1 hover:scale-105 active:translate-y-0 active:scale-100",
        ghost: "bg-glass-bg backdrop-blur-glass border border-glass-border text-foreground hover:bg-accent hover:text-accent-foreground hover:-translate-y-1",
        link: "text-primary underline-offset-4 hover:underline",
        accent: "bg-accent-gradient text-white shadow-button hover:shadow-glow hover:-translate-y-1 hover:scale-105 active:translate-y-0 active:scale-100",
        success: "bg-gradient-to-r from-neon-teal to-neon-green text-white shadow-button hover:shadow-glow hover:-translate-y-1 hover:scale-105 active:translate-y-0 active:scale-100",
        warning: "bg-gradient-to-r from-neon-yellow to-orange-500 text-white shadow-button hover:shadow-glow hover:-translate-y-1 hover:scale-105 active:translate-y-0 active:scale-100",
        error: "bg-gradient-to-r from-neon-pink to-red-500 text-white shadow-button hover:shadow-glow hover:-translate-y-1 hover:scale-105 active:translate-y-0 active:scale-100",
        tab: "bg-transparent border-none text-foreground font-normal rounded-none border-b-2 border-transparent hover:bg-accent/10 hover:translate-y-0 hover:scale-100 data-[active=true]:font-bold data-[active=true]:border-primary data-[active=true]:text-primary",
        utility: "bg-transparent border-none text-foreground text-xs rounded-md hover:bg-accent/10 hover:translate-y-0 hover:scale-100",
      },
      size: {
        default: "h-11 px-6 py-2",
        sm: "h-9 rounded-xl px-4 text-xs",
        lg: "h-13 rounded-2xl px-8 text-base",
        xl: "h-15 rounded-3xl px-10 text-lg",
        icon: "h-10 w-10",
        xs: "h-8 rounded-lg px-3 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface AeButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof aeButtonVariants> {
  asChild?: boolean
  loading?: boolean
  fullWidth?: boolean
  glow?: boolean
  active?: boolean
}

const AeButton = React.forwardRef<HTMLButtonElement, AeButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    asChild = false, 
    loading = false,
    fullWidth = false,
    glow = false,
    active = false,
    children,
    disabled,
    ...props 
  }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    return (
      <Comp
        className={cn(
          aeButtonVariants({ variant, size, className }),
          fullWidth && "w-full",
          glow && "shadow-glow animate-pulse-glow",
          active && "data-[active=true]",
          loading && "cursor-wait",
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        data-active={active}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </Comp>
    )
  }
)
AeButton.displayName = "AeButton"

export { AeButton, aeButtonVariants }
