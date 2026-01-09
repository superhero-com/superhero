import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useOnboarding, OnboardingStep } from "@/contexts/OnboardingContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useSectionTheme } from "@/components/layout/AppLayout";

interface TooltipPosition {
  top: number;
  left: number;
  arrowPosition: "top" | "bottom" | "left" | "right";
}

function calculatePosition(
  targetRect: DOMRect,
  tooltipWidth: number,
  tooltipHeight: number,
  position: OnboardingStep["position"]
): TooltipPosition {
  const padding = 16;
  const arrowSize = 12;

  switch (position) {
    case "right":
      return {
        top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
        left: targetRect.right + padding,
        arrowPosition: "left",
      };
    case "left":
      return {
        top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
        left: targetRect.left - tooltipWidth - padding,
        arrowPosition: "right",
      };
    case "bottom":
      return {
        top: targetRect.bottom + padding,
        left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
        arrowPosition: "top",
      };
    case "top":
    default:
      return {
        top: targetRect.top - tooltipHeight - padding,
        left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
        arrowPosition: "bottom",
      };
  }
}

export default function OnboardingTour() {
  const {
    isOnboardingActive,
    currentStep,
    steps,
    nextStep,
    prevStep,
    skipOnboarding,
  } = useOnboarding();
  const { isDark } = useTheme();
  const { colors } = useSectionTheme();
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const currentStepData = steps[currentStep];

  // Expand parent menu if needed
  useEffect(() => {
    if (!isOnboardingActive || !currentStepData) return;

    if (currentStepData.expandParent) {
      // Dispatch custom event to expand the menu (without toggling)
      const event = new CustomEvent("expand-sidebar-menu", {
        detail: { menuId: currentStepData.expandParent },
      });
      window.dispatchEvent(event);
    }
  }, [isOnboardingActive, currentStep, currentStepData]);

  // Find target element and calculate position
  useEffect(() => {
    if (!isOnboardingActive || !currentStepData) return;

    const findAndPositionTooltip = () => {
      const targetElement = document.getElementById(currentStepData.targetId);
      if (!targetElement || !tooltipRef.current) return;

      const rect = targetElement.getBoundingClientRect();
      setTargetRect(rect);

      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const position = calculatePosition(
        rect,
        tooltipRect.width || 320,
        tooltipRect.height || 200,
        currentStepData.position
      );

      // Ensure tooltip stays within viewport
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (position.left < 16) position.left = 16;
      if (position.left + 320 > viewportWidth - 16) {
        position.left = viewportWidth - 320 - 16;
      }
      if (position.top < 16) position.top = 16;
      if (position.top + 200 > viewportHeight - 16) {
        position.top = viewportHeight - 200 - 16;
      }

      setTooltipPosition(position);
    };

    // Delay to allow for menu expansion animation
    const timer = setTimeout(findAndPositionTooltip, 200);

    // Reposition on resize
    window.addEventListener("resize", findAndPositionTooltip);
    window.addEventListener("scroll", findAndPositionTooltip, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", findAndPositionTooltip);
      window.removeEventListener("scroll", findAndPositionTooltip, true);
    };
  }, [isOnboardingActive, currentStep, currentStepData]);

  if (!isOnboardingActive || !currentStepData) return null;

  const arrowClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent",
    bottom: "top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent",
    left: "right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent",
    right: "left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent",
  };

  return createPortal(
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[9998] transition-opacity duration-300"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        onClick={skipOnboarding}
      />

      {/* Highlight cutout for target element */}
      {targetRect && (
        <div
          className="fixed z-[9999] pointer-events-none rounded-xl transition-all duration-300"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.5), 0 0 20px ${colors.primary}40`,
            border: `2px solid ${colors.primary}`,
          }}
        />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className={`
          fixed z-[10000] w-80 p-5 rounded-2xl shadow-2xl
          transition-all duration-300 ease-out
          ${isDark 
            ? "bg-slate-800 border border-slate-600 text-white" 
            : "bg-white border border-gray-200 text-gray-900"
          }
        `}
        style={{
          top: tooltipPosition?.top ?? -9999,
          left: tooltipPosition?.left ?? -9999,
          opacity: tooltipPosition ? 1 : 0,
          transform: tooltipPosition ? "scale(1)" : "scale(0.95)",
        }}
      >
        {/* Arrow */}
        <div
          className={`
            absolute w-0 h-0 border-8
            ${arrowClasses[tooltipPosition?.arrowPosition || "left"]}
            ${isDark ? "border-slate-800" : "border-white"}
          `}
        />

        {/* Step indicator */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex gap-1.5">
            {steps.map((_, index) => (
              <div
                key={index}
                className="w-2 h-2 rounded-full transition-colors"
                style={{
                  backgroundColor: index === currentStep 
                    ? colors.primary 
                    : index < currentStep 
                      ? colors.primaryLight 
                      : isDark ? "#475569" : "#E5E7EB"
                }}
              />
            ))}
          </div>
          <button
            onClick={skipOnboarding}
            className={`
              text-xs font-medium transition-colors
              ${isDark 
                ? "text-slate-400 hover:text-white" 
                : "text-gray-400 hover:text-gray-600"
              }
            `}
          >
            Skip tour
          </button>
        </div>

        {/* Content */}
        <h3 className="text-lg font-bold mb-2">{currentStepData.title}</h3>
        <p className={`text-sm leading-relaxed mb-4 ${isDark ? "text-slate-300" : "text-gray-600"}`}>
          {currentStepData.description}
        </p>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all
              disabled:opacity-40 disabled:cursor-not-allowed
              ${isDark 
                ? "text-slate-300 hover:bg-slate-700 disabled:hover:bg-transparent" 
                : "text-gray-600 hover:bg-gray-100 disabled:hover:bg-transparent"
              }
            `}
          >
            ← Back
          </button>
          <button
            onClick={nextStep}
            className="px-5 py-2 rounded-lg text-sm font-semibold transition-all text-white active:scale-95"
            style={{
              background: colors.gradient,
              boxShadow: `0 10px 25px -5px ${colors.primary}40`,
            }}
          >
            {currentStep === steps.length - 1 ? "Get Started! 🚀" : "Next →"}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

