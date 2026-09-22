import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, TriangleAlert, WifiOff } from 'lucide-react';

// Block-level tab states from the profile design (plate 06). Each is sized so it
// occupies the tab panel only — the header above is a separate query and stays.

export const TabOfflineBanner = memo(() => {
  const { t } = useTranslation('social');
  return (
    <div
      role="status"
      className="mb-3 flex items-center gap-2 rounded-xl border border-solid border-[#ffd93d]/30 bg-[#ffd93d]/[0.06] px-3 py-2 text-xs font-medium text-[#ffd93d]"
    >
      <WifiOff className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
      <span>{t('profileTabs.offline')}</span>
    </div>
  );
});
TabOfflineBanner.displayName = 'TabOfflineBanner';

export const TabErrorState = memo(({ onRetry }: { onRetry: () => void }) => {
  const { t } = useTranslation('social');
  return (
    <div className="mt-3 flex flex-col items-center gap-3 rounded-2xl border border-solid border-white/10 bg-white/[0.02] px-6 py-10 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-[#ff6b6b]/10 text-[#ff6b6b]">
        <TriangleAlert className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <div>
        <h3 className="text-base font-semibold text-white">{t('profileTabs.loadFailedTitle')}</h3>
        <p className="mt-1 text-sm text-white/60">{t('profileTabs.loadFailedSubtitle')}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="mt-1 inline-flex h-10 items-center gap-2 rounded-full border border-solid border-white/20 bg-white/5 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      >
        <RefreshCw className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        {t('profileTabs.tryAgain')}
      </button>
    </div>
  );
});
TabErrorState.displayName = 'TabErrorState';
