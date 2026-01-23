import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

export interface OnboardingStep {
  id: string;
  targetId: string; // DOM element ID to highlight
  title: string;
  description: string;
  position: "top" | "bottom" | "left" | "right";
  expandParent?: string; // Nav item ID to expand before showing this step
}

interface OnboardingContextValue {
  isOnboardingActive: boolean;
  currentStep: number;
  steps: OnboardingStep[];
  startOnboarding: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipOnboarding: () => void;
  completeOnboarding: () => void;
  hasSeenOnboarding: boolean;
  resetOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(undefined);

const ONBOARDING_STORAGE_KEY = "superhero-onboarding-completed";

// Define the onboarding steps
const onboardingSteps: OnboardingStep[] = [
  {
    id: "hashtags",
    targetId: "nav-hashtags",
    title: "# Explore Hashtags",
    description: "Every hashtag is a token! Discover trending topics on bonding curves. Price moves with buys and sells. Each hashtag creates a DAO with its own treasury.",
    position: "right",
    expandParent: "hashtags",
  },
  {
    id: "create",
    targetId: "nav-hashtags-create",
    title: "✨ Create a Hashtag",
    description: "Have a trending idea? Tokenize it! Launch your own hashtag with a DAO and treasury. Let others invest in your vision and watch it grow.",
    position: "right",
    expandParent: "hashtags",
  },
  {
    id: "invite",
    targetId: "nav-hashtags-invite",
    title: "🎁 Invite & Earn",
    description: "Share Superhero with friends and earn rewards! Get a percentage of trading fees from users you refer. The more you share, the more you earn.",
    position: "right",
    expandParent: "hashtags",
  },
  {
    id: "social",
    targetId: "nav-social",
    title: "💬 Social",
    description: "Connect with the community! Post updates, share insights, and tip creators directly on-chain. All your social interactions are permanently stored on the æternity blockchain.",
    position: "right",
  },
  {
    id: "defi",
    targetId: "nav-defi",
    title: "🏦 DeFi",
    description: "Access decentralized finance tools! Swap tokens, provide liquidity to pools, wrap AE, bridge assets from Ethereum, and buy AE directly with ETH.",
    position: "right",
  },
];

interface OnboardingProviderProps {
  children: ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
    }
    return false;
  });

  const [isOnboardingActive, setIsOnboardingActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Auto-start onboarding for new users after a short delay
  useEffect(() => {
    if (!hasSeenOnboarding) {
      const timer = setTimeout(() => {
        setIsOnboardingActive(true);
      }, 1500); // 1.5 second delay to let the page load
      return () => clearTimeout(timer);
    }
  }, [hasSeenOnboarding]);

  const startOnboarding = useCallback(() => {
    setCurrentStep(0);
    setIsOnboardingActive(true);
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      completeOnboarding();
    }
  }, [currentStep]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const skipOnboarding = useCallback(() => {
    setIsOnboardingActive(false);
    setHasSeenOnboarding(true);
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
  }, []);

  const completeOnboarding = useCallback(() => {
    setIsOnboardingActive(false);
    setHasSeenOnboarding(true);
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
  }, []);

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    setHasSeenOnboarding(false);
    setCurrentStep(0);
  }, []);

  const value: OnboardingContextValue = {
    isOnboardingActive,
    currentStep,
    steps: onboardingSteps,
    startOnboarding,
    nextStep,
    prevStep,
    skipOnboarding,
    completeOnboarding,
    hasSeenOnboarding,
    resetOnboarding,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
}

