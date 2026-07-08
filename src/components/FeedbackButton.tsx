import React, { useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '@/hooks';

const FeedbackButton = () => {
  const { t } = useTranslation('common');
  const [isHovered, setIsHovered] = useState(false);
  const [showMobilePopup, setShowMobilePopup] = useState(false);
  const isMobile = useIsMobile();

  const handleClick = () => {
    if (isMobile && !showMobilePopup) {
      // On mobile, show popup first
      setShowMobilePopup(true);
    } else {
      // On desktop or after popup confirmation, open GitHub
      window.open('https://github.com/superhero-com/superhero/issues', '_blank', 'noopener,noreferrer');
      setShowMobilePopup(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-glow bg-gradient-brand-135 text-white transition-all duration-300 hover:shadow-xl hover:scale-105 active:scale-95"
        aria-label={t('buttons.sendFeedback')}
        title={t('buttons.sendFeedback')}
      >
        <MessageSquare
          className={`w-5 h-5 transition-transform duration-300 ${isHovered ? 'rotate-12' : ''}`}
        />
        {isHovered && !isMobile && (
          <span
            className="text-sm font-semibold whitespace-nowrap animate-in fade-in slide-in-from-right-2 duration-300"
          >
            {t('buttons.sendFeedback')}
          </span>
        )}
      </button>

      {/* Mobile Popup */}
      {showMobilePopup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm md:hidden">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label={t('feedback.closeOverlayAria')}
            onClick={() => setShowMobilePopup(false)}
          />
          <div
            className="liquid-glass liquid-glass--strong rounded-xl p-6 max-w-sm w-full relative"
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
          >
            <button
              type="button"
              onClick={() => setShowMobilePopup(false)}
              className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/10 transition-colors"
              aria-label={t('buttons.close')}
            >
              <X className="w-5 h-5 text-white" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(to right, var(--neon-teal), var(--neon-teal), #5eead4)',
                }}
              >
                <MessageSquare className="w-6 h-6" style={{ color: '#0a0a0f' }} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{t('buttons.sendFeedback')}</h3>
                <p className="text-sm text-white/70">{t('feedback.subtitle')}</p>
              </div>
            </div>

            <p className="text-sm text-white/80 mb-6">
              {t('feedback.line1')}
              <br />
              {t('feedback.line2')}
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowMobilePopup(false)}
                className="flex-1 px-4 py-2.5 rounded-btn border border-white/20 bg-white/5 text-white font-medium hover:bg-white/10 transition-colors backdrop-blur-sm"
              >
                {t('buttons.cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  window.open('https://github.com/superhero-com/superhero/issues', '_blank', 'noopener,noreferrer');
                  setShowMobilePopup(false);
                }}
                className="flex-1 px-4 py-2.5 rounded-btn font-medium bg-gradient-brand-135 text-white transition-all duration-300 hover:shadow-glow"
              >
                {t('feedback.openGitHub')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FeedbackButton;
