import { Clock } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';

interface TokenCreationBannerProps {
  txHash: string | null;
  txConfirmed: boolean;
  tokenName?: string;
  hasSaleAddress: boolean;
  onDismiss: () => void;
}

function step3CircleClass(hasSaleAddress: boolean, txConfirmed: boolean): string {
  if (hasSaleAddress) return 'bg-[#4ecdc4] text-[#0a0a0f]';
  if (txConfirmed) return 'bg-[#4ecdc4]/20 text-[#4ecdc4] ring-1 ring-[#4ecdc4]';
  return 'bg-white/10 text-white/30';
}

const TokenCreationBanner = ({
  txHash,
  txConfirmed,
  tokenName,
  hasSaleAddress,
  onDismiss,
}: TokenCreationBannerProps) => {
  const { t } = useTranslation();

  const statusMessage = () => {
    if (!txHash) return t('trending.creationBanner.statusInProgress');
    return txConfirmed
      ? t('trending.creationBanner.statusConfirmed')
      : t('trending.creationBanner.statusWaiting');
  };

  return (
    <div className="fixed top-[calc(var(--mobile-navigation-height,0px)+env(safe-area-inset-top,0px)+1rem)] md:top-6 right-4 md:right-6 left-4 md:left-auto z-[9999] md:max-w-sm w-auto">
      <div className="liquid-glass liquid-glass--strong rounded-xl p-4 animate-in slide-in-from-top duration-400">

        {/* Step progress */}
        <div className="flex items-center mb-4">
          {/* Step 1 – Broadcast (always complete) */}
          <div className="flex flex-col items-center gap-0.5">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-500 bg-[#4ecdc4] text-[#0a0a0f]">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="text-[9px] text-white/50 font-medium">{t('trending.creationBanner.stepBroadcast')}</span>
          </div>

          <div className={`flex-1 h-px mx-1.5 mb-3.5 transition-all duration-700 ${txConfirmed ? 'bg-[#4ecdc4]' : 'bg-white/15'}`} />

          {/* Step 2 – Confirm (active when txConfirmed) */}
          <div className="flex flex-col items-center gap-0.5">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-500 ${
              txConfirmed
                ? 'bg-[#4ecdc4] text-[#0a0a0f]'
                : 'bg-[#4ecdc4]/20 text-[#4ecdc4] ring-1 ring-[#4ecdc4]'
            }`}
            >
              {txConfirmed ? (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : '2'}
            </div>
            <span className="text-[9px] text-white/50 font-medium">{t('trending.creationBanner.stepConfirm')}</span>
          </div>

          <div className={`flex-1 h-px mx-1.5 mb-3.5 transition-all duration-700 ${hasSaleAddress ? 'bg-[#4ecdc4]' : 'bg-white/15'}`} />

          {/* Step 3 – Live (active when hasSaleAddress) */}
          <div className="flex flex-col items-center gap-0.5">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-500 ${step3CircleClass(hasSaleAddress, txConfirmed)}`}>
              {hasSaleAddress ? (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : '🚀'}
            </div>
            <span className="text-[9px] text-white/50 font-medium">{t('trending.creationBanner.stepLive')}</span>
          </div>
        </div>

        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="relative flex-shrink-0 mt-0.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#4ecdc4] to-[#44a08d] flex items-center justify-center transition-all duration-500">
              {txHash && txConfirmed ? (
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <Clock className="w-4 h-4 text-white" />
              )}
            </div>
            {!(txHash && txConfirmed) && (
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#4ecdc4] to-[#44a08d] animate-ping opacity-25" />
            )}
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-sm font-bold text-white leading-snug">
              {statusMessage()}
            </p>
            <p className="text-xs text-white/60 leading-relaxed">
              {(() => {
                if (txHash && txConfirmed) {
                  return (
                    <Trans
                      i18nKey="trending.creationBanner.loadingData"
                      values={{ tokenName }}
                      components={{ token: <span className="text-[#4ecdc4] font-semibold" /> }}
                    />
                  );
                }
                if (txHash) {
                  return (
                    <Trans
                      i18nKey="trending.creationBanner.waitingConfirmation"
                      values={{ tokenName }}
                      components={{ token: <span className="px-1 text-[#4ecdc4] font-semibold" /> }}
                    />
                  );
                }
                return (
                  <Trans
                    i18nKey="trending.creationBanner.beingConfirmed"
                    values={{ tokenName }}
                    components={{ token: <span className="px-1 text-[#4ecdc4] font-semibold" /> }}
                  />
                );
              })()}
            </p>

            {/* Progress bar */}
            <div className="w-full bg-white/10 rounded-full h-1 mt-2 overflow-hidden">
              <div className={`h-1 rounded-full bg-gradient-to-r from-[#4ecdc4] to-[#7fffd4] transition-all duration-700 ${
                txHash && txConfirmed ? 'w-3/4' : 'w-1/3 animate-pulse'
              }`}
              />
            </div>
          </div>

          {/* Dismiss */}
          <button
            type="button"
            onClick={onDismiss}
            className="flex-shrink-0 text-white/30 hover:text-white/80 transition-colors mt-0.5"
            aria-label={t('trending.creationBanner.dismissAria')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TokenCreationBanner;
