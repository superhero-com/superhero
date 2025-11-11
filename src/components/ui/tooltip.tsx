import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import clsx from "clsx";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

type TooltipContentProps = React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
  className?: string;
};

export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  TooltipContentProps
>(function TooltipContent(
  { className, sideOffset = 8, children, ...props },
  ref
) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        collisionPadding={8}
        avoidCollisions={true}
        // Keep position updated even during animations/resize
        updatePositionStrategy="always"
        className={clsx(
          "z-50 rounded-xl border border-white/10 bg-white/10 text-white/90 backdrop-blur-md",
          "shadow-lg ring-1 ring-black/5",
          "px-3 py-2 text-[12px] leading-relaxed",
          className
        )}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="fill-white/10" width={10} height={5} />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}
);


