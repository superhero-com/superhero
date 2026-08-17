import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAeSdk } from '../../hooks/useAeSdk';
import { useXPostingReward } from '../../hooks/useXPostingReward';

type RewardsOnboardingProps = {
  /** `feed` = wide card injected between home-feed items; `rail` = compact side-menu card. */
  variant?: 'feed' | 'rail';
  className?: string;
};

/**
 * Inline onboarding nudge (never a modal / pop-up) that mirrors the rewards
 * page design. Shows which setup steps are done so the user can continue.
 * Rendered between home-feed items and as the first item in the right rail.
 */
const RewardsOnboarding = ({ variant = 'feed', className }: RewardsOnboardingProps) => {
  const { t } = useTranslation('trending');
  const navigate = useNavigate();
  const { activeAccount } = useAeSdk();
  const {
    status,
    statusLoading,
    isXLinked,
    isOnboardingPaid,
    onboardingComplete,
  } = useXPostingReward();

  const handleContinue = useCallback(() => {
    if (!isXLinked) {
      // Step 1: link X — done on the profile page.
      if (activeAccount) navigate(`/users/${encodeURIComponent(activeAccount)}`);
      return;
    }
    // Step 2: post & earn — handled on the rewards page.
    navigate('/trends/invite');
  }, [activeAccount, isXLinked, navigate]);

  // Only nudge connected users who still have onboarding to finish. Avoid a
  // flash before the status is known.
  if (!activeAccount) return null;
  if (statusLoading && !status) return null;
  if (onboardingComplete) return null;

  const steps = [
    { text: t('onboarding.step1'), done: isXLinked },
    { text: t('onboarding.step2'), done: isOnboardingPaid },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const total = steps.length;
  const progressPct = Math.min((doneCount / total) * 100, 100);
  const ctaLabel = isXLinked ? t('onboarding.postOnX') : t('onboarding.connectX');
  const isRail = variant === 'rail';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-blue-500/5 backdrop-blur-xl animate-scaleIn hover-lift',
        isRail ? 'p-4' : 'p-5 md:p-6',
        className,
      )}
    >
      <div className="absolute -top-16 -right-16 h-32 w-32 rounded-full bg-cyan-500/10 blur-3xl animate-float" aria-hidden />
      <div className="relative">
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/25 bg-cyan-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-300">
            <Sparkles className="h-3 w-3" aria-hidden />
            {t('onboarding.badge')}
          </span>
        </div>

        <h3 className={cn('m-0 font-bold text-white', isRail ? 'text-sm' : 'text-lg')}>
          {t('onboarding.title')}
        </h3>
        {!isRail && (
          <p className="mt-1 mb-4 text-sm text-white/60">{t('onboarding.subtitle')}</p>
        )}

        <div className={cn('grid gap-2', isRail ? 'my-3' : 'my-4')}>
          {steps.map((step, i) => (
            <div
              key={step.text}
              className={cn(
                'flex items-start gap-2.5 rounded-xl p-2.5 transition-colors',
                step.done ? 'bg-emerald-500/10' : 'bg-white/[0.04]',
              )}
            >
              <div
                className={cn(
                  'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold',
                  step.done
                    ? 'bg-emerald-500/25 text-emerald-400'
                    : 'border border-white/10 bg-white/5 text-white/50',
                )}
              >
                {step.done ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
              </div>
              <span
                className={cn(
                  'pt-0.5 text-xs leading-relaxed',
                  step.done ? 'text-emerald-300/80' : 'text-white/80',
                )}
              >
                {step.text}
              </span>
            </div>
          ))}
        </div>

        <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-700 ease-out relative"
            style={{
              width: `${progressPct}%`,
              animation: progressPct > 0 ? 'progressFill 1s ease-out' : 'none',
            }}
          >
            {progressPct > 0 && (
              <div className="absolute inset-0 bg-white/20 animate-shimmer" />
            )}
          </div>
        </div>
        <p className="mb-3 text-[11px] text-white/40">
          {t('onboarding.progress', { done: doneCount, total })}
        </p>

        <button
          type="button"
          onClick={handleContinue}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:from-cyan-400 hover:to-blue-400 hover:shadow-lg hover:shadow-cyan-500/25 hover-lift group"
        >
          {ctaLabel}
          <span className="text-base group-hover:animate-bounce">→</span>
        </button>
      </div>
    </div>
  );
};

export default RewardsOnboarding;
