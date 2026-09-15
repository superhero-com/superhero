import React, { useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { MonitorSmartphone, Share, X } from 'lucide-react';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { usePwaInstallSnooze } from '@/hooks/usePwaInstallSnooze';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { MobileAppInstallDialog } from '@/components/MobileAppInstall';

/**
 * Floating bottom-right "Install app" affordance.
 *
 * The button says the same thing it always did. What changed is where it goes:
 * it used to expand into a card selling the PWA, or fire the browser's install
 * prompt directly. Now it opens the mobile-app dialog — the same body as the
 * card in the connect modal — because the store build is the one we want
 * people on.
 *
 * The PWA is not removed and is not gated. It is the secondary line inside
 * that dialog: the native prompt where the browser gave us one, the
 * hand-written Safari steps on iOS where no install API exists.
 *
 * Visibility is unchanged — this still only appears where a PWA install is
 * actually possible. Widening that is a product call, not a side effect of
 * changing what the button opens.
 */
export const PwaInstallPrompt = () => {
  const { t } = useTranslation();
  const {
    canPrompt, promptInstall, isIOS, isInstalled,
  } = usePwaInstall();
  // Persisted: component state alone brought the card back on every reload, with
  // no way for the user to ever say "not this".
  const { isSnoozed, snooze } = usePwaInstallSnooze();
  // Hides the button the instant an install is accepted, without waiting on
  // `appinstalled`. Deliberately NOT the snooze: they installed, so there is no
  // dismissal to remember.
  const [justInstalled, setJustInstalled] = useState(false);
  const [appDialogOpen, setAppDialogOpen] = useState(false);
  const [iosDialogOpen, setIosDialogOpen] = useState(false);
  const iosTriggerRef = useRef<HTMLButtonElement>(null);

  // Don't render if already installed, not installable, or dismissed
  if (isInstalled || justInstalled || (!canPrompt && !isIOS) || isSnoozed) return null;

  const handleInstallWebApp = async () => {
    setAppDialogOpen(false);
    if (isIOS) {
      setIosDialogOpen(true);
      return;
    }
    const accepted = await promptInstall();
    if (accepted) setJustInstalled(true);
  };

  return (
    <>
      <div
        className="fixed bottom-20 right-4 z-40 flex items-center gap-1.5"
        style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <button
          type="button"
          onClick={() => setAppDialogOpen(true)}
          className="flex items-center gap-2 rounded-full bg-gray-900/95 backdrop-blur-xl border border-white/10 shadow-2xl px-3 py-2 hover:bg-gray-900 transition-colors"
        >
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/20">
            <MonitorSmartphone className="w-3.5 h-3.5 text-pink-400" />
          </span>
          <span className="text-xs font-medium text-white pr-1">
            {t('common.views.landing.pwaInstall.installApp')}
          </span>
        </button>
        <button
          type="button"
          onClick={snooze}
          className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-900/95 backdrop-blur-xl border border-white/10 text-white/50 hover:text-white transition-colors"
          aria-label={t('common.views.landing.pwaInstall.dismiss')}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* The store listings, in the same design as the connect-modal card. */}
      <MobileAppInstallDialog
        open={appDialogOpen}
        onOpenChange={setAppDialogOpen}
        onInstallWebApp={handleInstallWebApp}
      />

      {/* iOS has no install API, so the web-app path is hand-written steps. */}
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
              <DialogDescription className="text-sm text-white/70 leading-relaxed">
                {t('common.views.landing.pwaInstall.iosIntro')}
              </DialogDescription>

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
