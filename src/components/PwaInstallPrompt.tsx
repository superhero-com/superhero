import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Download, MonitorSmartphone, Share, X, ChevronDown, ChevronUp,
} from 'lucide-react';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';

/**
 * Floating bottom-right PWA install prompt that appears globally across the app.
 * Displays above the bottom navigation bar with expandable/collapsible states.
 * Platform-aware: shows native install button on Chromium, manual instructions on iOS.
 */
export function PwaInstallPrompt() {
  const { t } = useTranslation();
  const {
    canPrompt, promptInstall, isIOS, isInstalled,
  } = usePwaInstall();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [iosDialogOpen, setIosDialogOpen] = useState(false);
  const iosTriggerRef = useRef<HTMLButtonElement>(null);

  // Don't render if already installed, not installable, or dismissed
  if (isInstalled || (!canPrompt && !isIOS) || isDismissed) return null;

  return (
    <>
      {/* Floating bottom-right container */}
      <div
        className="fixed bottom-20 right-4 z-40 max-w-sm"
        style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          {/* Collapsed state - just the header bar */}
          {!isExpanded && (
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/20">
                  <MonitorSmartphone className="w-4 h-4 text-pink-400" />
                </div>
                <span className="text-sm font-semibold text-white">
                  {t('common.views.landing.pwaInstall.title')}
                </span>
              </div>
              <ChevronUp className="w-5 h-5 text-white/50" />
            </button>
          )}

          {/* Expanded state - full content */}
          {isExpanded && (
            <div className="p-4">
              {/* Header with minimize and close buttons */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/20">
                    <MonitorSmartphone className="w-5 h-5 text-pink-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white leading-tight">
                      {t('common.views.landing.pwaInstall.title')}
                    </h3>
                    {!isIOS && (
                      <p className="text-xs text-white/60 mt-0.5">
                        {t('common.views.landing.pwaInstall.description')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsExpanded(false)}
                    className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                    aria-label="Minimize"
                  >
                    <ChevronDown className="w-4 h-4 text-white/50" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDismissed(true)}
                    className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                    aria-label="Dismiss"
                  >
                    <X className="w-4 h-4 text-white/50" />
                  </button>
                </div>
              </div>

              {/* Action button */}
              <div className="mt-3">
                {isIOS ? (
                  <button
                    ref={iosTriggerRef}
                    type="button"
                    onClick={() => setIosDialogOpen(true)}
                    className="w-full group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-medium text-sm px-4 py-2.5 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-pink-500/25"
                  >
                    <Share className="w-4 h-4" />
                    Show Instructions
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      const accepted = await promptInstall();
                      if (accepted) {
                        setIsDismissed(true);
                      }
                    }}
                    className="w-full group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-medium text-sm px-4 py-2.5 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-pink-500/25"
                  >
                    <Download className="w-4 h-4" />
                    {t('common.views.landing.pwaInstall.installButton')}
                  </button>
                )}
              </div>
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
                Add Superhero to your home screen for quick access and a full-screen experience.
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
                      Tap the <Share className="inline w-3.5 h-3.5 mx-0.5" /> icon in Safari&apos;s toolbar
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
                      Scroll and select &quot;Add to Home Screen&quot;
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
}
