/* eslint-disable
  react/function-component-definition,
  react/button-has-type,
  no-empty
*/
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CollectRewardsCard,
  InvitationList,
  InviteAndEarnCard,
  RewardsProgram,
} from '../../features/trending/components/Invitation';
import Shell from '../../components/layout/Shell';
import PageSpaceHero from '../../components/hero-banner/PageSpaceHero';
import { useAeSdk } from '../../hooks';

export default function Invite() {
  const { t } = useTranslation('trending');
  const { activeAccount } = useAeSdk();
  const [showInfo, setShowInfo] = useState<boolean>(() => {
    try {
      return localStorage.getItem('invite_info_dismissed') !== '1';
    } catch {
      return true;
    }
  });

  return (
    <Shell>
      <div className="mx-auto px-4 py-2">
        {/* Hero */}
        <PageSpaceHero
          className="mb-8 px-6 py-10 md:px-10 md:py-14"
          supernovaColor="rgba(0,229,255,.5)"
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold m-0 leading-tight">
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              {t('inviteView.heroBrand')}
              {' '}
            </span>
            <span className="text-white">{t('inviteView.heroRewards')}</span>
          </h1>
        </PageSpaceHero>
        {/* ========== NEW: Superhero Rewards Program ========== */}
        <RewardsProgram />

        <div className="bg-[#0d1117]/10 backdrop-blur-xl border rounded-2xl relative overflow-hidden transition-all duration-300 p-6 md:p-8 border-cyan-500/20 mb-5">
          <h3 className="mb-5 m-1 text-2xl md:text-2xl font-bold text-white">
            {t('inviteView.referAndEarn')}
          </h3>
          {/* Info Card (existing, dismissible) */}
          {showInfo && (
          <div className="bg-[#0d1117]/50 backdrop-blur-xl border rounded-2xl relative overflow-hidden transition-all duration-300 p-6 md:p-8 border-cyan-500/20 mb-5">
            <button
              onClick={() => {
                try {
                  localStorage.setItem('invite_info_dismissed', '1');
                } catch { }
                setShowInfo(false);
              }}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-white/5 border border-white/10 text-white/40 cursor-pointer w-8 h-8 rounded-lg transition-all duration-200 flex items-center justify-center hover:bg-white/10 hover:text-white/70 z-20 text-sm"
              aria-label={t('inviteView.dismiss')}
            >
              ✕
            </button>

            <div className="relative z-10 pr-10">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4" />
                    <path d="M12 8h.01" />
                  </svg>
                </div>
                <h3 className="m-0 text-xl md:text-2xl font-bold text-white">
                  {t('inviteView.howItWorks')}
                </h3>
              </div>
              <div className="grid gap-3">
                {[
                  t('inviteView.step1'),
                  t('inviteView.step2'),
                  t('inviteView.step3'),
                  t('inviteView.step4'),
                ].map((text, i) => (
                  <div key={text} className="flex items-start gap-3 p-2 rounded-lg">
                    <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-semibold text-white/50 flex-shrink-0 text-xs">
                      {i + 1}
                    </div>
                    <div className="text-white/80 leading-relaxed text-sm flex-1 min-w-0 pt-0.5">
                      {text}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          )}
          {/* Main Action Cards */}

          <div className="space-y-8">
            <InviteAndEarnCard />
            <CollectRewardsCard />
          </div>
        </div>
        {/* User Invitations */}
        {activeAccount && (
          <div className="mb-12">
            <h3 className="text-xl md:text-2xl font-bold m-0 mb-6 text-white">
              {t('inviteView.yourInvitations')}
            </h3>
            <InvitationList />
          </div>
        )}

        {/* ========== Disclaimer ========== */}
        <div className="border-t border-white/10 mt-10 pt-6 pb-8">
          <p className="text-xs text-white/50 leading-relaxed m-0">
            {t('inviteView.disclaimer')}
          </p>
        </div>
      </div>
    </Shell>
  );
}
