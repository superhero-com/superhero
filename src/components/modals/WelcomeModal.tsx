import React from 'react';
import { Sparkles } from 'lucide-react';
import { useSetAtom } from 'jotai';
import { AeButton } from '@/components/ui/ae-button';
import Favicon from '@/svg/favicon.svg?react';
import { profileEditModalOpenAtom } from '@/atoms/profileEditModalAtom';

type Props = { onClose: () => void };

const ONBOARDING_SKIP_KEY = 'onboarding:skip';

export function hasCompletedOnboarding(): boolean {
  try {
    return localStorage.getItem(ONBOARDING_SKIP_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markOnboardingComplete(): void {
  try {
    localStorage.setItem(ONBOARDING_SKIP_KEY, 'true');
  } catch {
    // ignore quota / private mode
  }
}

const WelcomeModal = ({ onClose }: Props) => {
  const setProfileEditOpen = useSetAtom(profileEditModalOpenAtom);

  function handleGetStarted() {
    markOnboardingComplete();
    onClose();
    // Open the profile edit modal (same as clicking "SuperheroID" in side menu)
    setProfileEditOpen(true);
  }

  function handleContinueAsGuest() {
    markOnboardingComplete();
    onClose();
  }

  return (
    <div className="text-foreground p-2 sm:p-0 text-center">
      {/* Logo & Hero */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <Favicon className="w-10 h-10" />
        <Sparkles className="w-5 h-5 text-[var(--neon-teal)]" />
      </div>

      <h2 className="text-2xl font-bold text-white/95 mb-2">
        Welcome to Superhero
      </h2>

      <p className="text-sm text-white/60 leading-relaxed max-w-xs mx-auto mb-8">
        Trade tokenized hashtags &amp; social trends — the web3 attention market.
      </p>

      {/* Get Started */}
      <AeButton
        variant="default"
        size="lg"
        className="w-full max-w-[280px] uppercase tracking-wide !bg-[#1161FE] text-white hover:!bg-[#0f53df] rounded-xl font-semibold"
        onClick={handleGetStarted}
      >
        Get Started
      </AeButton>

      {/* Continue as guest */}
      <div className="mt-4">
        <button
          type="button"
          className="text-sm text-white/50 underline underline-offset-2 hover:text-white/70 transition-colors bg-transparent border-none cursor-pointer"
          onClick={handleContinueAsGuest}
        >
          Continue as guest
        </button>
      </div>
    </div>
  );
};

export default WelcomeModal;
