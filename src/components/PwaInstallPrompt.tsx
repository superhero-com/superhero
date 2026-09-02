import React, { useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import {
  Download, MonitorSmartphone, Share, X, ChevronDown,
} from 'lucide-react';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { usePwaInstallSnooze } from '@/hooks/usePwaInstallSnooze';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

/**
 * Floating bottom-right PWA install prompt that appears globally across the app.
 * Displays above the bottom navigation bar with expandable/collapsible states.
 * Platform-aware: shows native install button on Chromium, manual instructions on iOS.
 */
export const PwaInstallPrompt = () => {
  const { t } = useTranslation();
  const {
    canPrompt, promptInstall, isIOS, isInstalled,
  } = usePwaInstall();
  const [isExpanded, setIsExpanded] = useState(false);
  // Persisted: component state alone brought the card back on every reload, with
  // no way for the user to ever say "not this".
  const { isSnoozed, snooze } = usePwaInstallSnooze();
  // Hides the card the instant an install is accepted, without waiting on
  // `appinstalled`. Deliberately NOT the snooze: they installed, so there is no
  // dismissal to remember.
  const [justInstalled, setJustInstalled] = useState(false);
  const [iosDialogOpen, setIosDialogOpen] = useState(false);
  const iosTriggerRef = useRef<HTMLButtonElement>(null);

  // Don't render if already installed, not installable, or dismissed
  if (isInstalled || justInstalled || (!canPrompt && !isIOS) || isSnoozed) return null;

  return (
    <>
      {/* Floating bottom-right container */}
      <div
        className="fixed bottom-20 right-4 z-40"
        style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className={`bg-gray-900/95 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden transition-all duration-300 ${isExpanded ? 'rounded-lg' : 'rounded-full'}`}>
          {/* Collapsed state - compact circular button */}
          {!isExpanded && (
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/20">
                <MonitorSmartphone className="w-3.5 h-3.5 text-pink-400" />
              </div>
              <span className="text-xs font-medium text-white pr-1">
                {t('common.views.landing.pwaInstall.installApp')}
              </span>
            </button>
          )}

          {/* Expanded state - slim rounded card */}
          {isExpanded && (
            <div className="w-72 p-3">
              {/* Header with minimize and close buttons */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/20">
                    <MonitorSmartphone className="w-4 h-4 text-pink-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-white leading-tight">
                      {t('common.views.landing.pwaInstall.installApp')}
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => setIsExpanded(false)}
                    className="p-1 rounded-full hover:bg-white/5 transition-colors"
                    aria-label={t('common.views.landing.pwaInstall.minimize')}
                  >
                    <ChevronDown className="w-3.5 h-3.5 text-white/50" />
                  </button>
                  <button
                    type="button"
                    onClick={snooze}
                    className="p-1 rounded-full hover:bg-white/5 transition-colors"
                    aria-label={t('common.views.landing.pwaInstall.dismiss')}
                  >
                    <X className="w-3.5 h-3.5 text-white/50" />
                  </button>
                </div>
              </div>

              {/* Feature bullets */}
              <ul className="space-y-1 mb-3 ml-1">
                <li className="flex items-center gap-1.5 text-xs text-white/70">
                  <span className="w-1 h-1 rounded-full bg-pink-400 shrink-0" />
                  {t('common.views.landing.pwaInstall.benefitHomescreen')}
                </li>
                <li className="flex items-center gap-1.5 text-xs text-white/70">
                  <span className="w-1 h-1 rounded-full bg-purple-400 shrink-0" />
                  {t('common.views.landing.pwaInstall.benefitWallet')}
                </li>
                <li className="flex items-center gap-1.5 text-xs text-white/70">
                  <span className="w-1 h-1 rounded-full bg-blue-400 shrink-0" />
                  {t('common.views.landing.pwaInstall.benefitNotifications')}
                </li>
              </ul>

              {/* Action button */}
              {isIOS ? (
                <button
                  ref={iosTriggerRef}
                  type="button"
                  onClick={() => setIosDialogOpen(true)}
                  className="w-full group inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-medium text-xs px-3 py-2 rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-pink-500/25"
                >
                  <Share className="w-3.5 h-3.5" />
                  {t('common.views.landing.pwaInstall.showInstructions')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    const accepted = await promptInstall();
                    if (accepted) {
                      setJustInstalled(true);
                    }
                  }}
                  className="w-full group inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-medium text-xs px-3 py-2 rounded-full transition-all duration-300 hover:shadow-lg hover:shadow-pink-500/25"
                >
                  <Download className="w-3.5 h-3.5" />
                  {t('common.views.landing.pwaInstall.installButton')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* iOS installation instructions dialog */}
      {isIOS && (
        <Dialog open={iosDialogOpen} onOpenChange={setIosDialogOpen}>
          <DialogContent
            className="bg-gray-900 border-white/12 text-white sm:max-w-[420px]"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              iosTriggerRef.current?.focus();
            }}
          >
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">
                {t('common.views.landing.pwaInstall.title')}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <p className="text-sm text-white/70 leading-relaxed">
                {t('common.views.landing.pwaInstall.iosIntro')}
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                  <div className="flex items-center justify-center w-8 h-8 shrink-0 rounded-lg bg-pink-500/20 text-pink-400 font-semibold text-sm">
                    1
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white mb-1">
                      {t('common.views.landing.pwaInstall.iosStep1')}
                    </p>
                    <p className="text-xs text-white/60">
                      <Trans
                        i18nKey="common.views.landing.pwaInstall.iosStep1Hint"
                        components={{
                          shareIcon: <Share className="inline w-3.5 h-3.5 mx-0.5" />,
                        }}
                      />
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                  <div className="flex items-center justify-center w-8 h-8 shrink-0 rounded-lg bg-purple-500/20 text-purple-400 font-semibold text-sm">
                    2
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white mb-1">
                      {t('common.views.landing.pwaInstall.iosStep2')}
                    </p>
                    <p className="text-xs text-white/60">
                      {t('common.views.landing.pwaInstall.iosStep2Hint')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
