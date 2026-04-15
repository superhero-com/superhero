/* eslint-disable
  react/function-component-definition,
  react/button-has-type,
  no-empty
*/
import { useState } from 'react';
import {
  CollectRewardsCard,
  InvitationList,
  InviteAndEarnCard,
  RewardsProgram,
} from '../../features/trending/components/Invitation';
import Shell from '../../components/layout/Shell';
import { useAeSdk } from '../../hooks';

const DISCLAIMER_TEXT = 'The Superhero reward program rewards users for creating content on other social media platforms (like X) with backlinks and/or invite links, referring new users to the platform. Rewards will be distributed in the form of ae tokens. Eligibility and rewards depend on on-chain activity, are not guaranteed and can be paused at any time without notice or liability. The right is reserved to disqualify any user from the program. Users from blacklisted countries are not eligible for rewards. By participating in the program, users agree to these terms and conditions. Rewards sent may be subject to tax reporting. Users are responsible for any tax obligations arising from receiving rewards.';

export default function Invite() {
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
        {/* ========== NEW: Superhero Rewards Program ========== */}
        <RewardsProgram />

        <div className="mb-8">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold m-0 text-white">
            Affiliate Program
          </h2>
        </div>

        {/* Info Card (existing, dismissible) */}
        {showInfo && (
          <div className="bg-[#0d1117]/10 backdrop-blur-xl border rounded-2xl relative overflow-hidden transition-all duration-300 p-6 md:p-8 border-cyan-500/20 mb-5">
            <button
              onClick={() => {
                try {
                  localStorage.setItem('invite_info_dismissed', '1');
                } catch { }
                setShowInfo(false);
              }}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-white/5 border border-white/10 text-white/40 cursor-pointer w-8 h-8 rounded-lg transition-all duration-200 flex items-center justify-center hover:bg-white/10 hover:text-white/70 z-20 text-sm"
              aria-label="Dismiss"
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
                  How it works
                </h3>
              </div>
              <div className="grid gap-3">
                {[
                  'Generate invite links by funding a one-time AE reward per invite',
                  'Share links with friends and community',
                  'After 4 unique invitees buy tokens, you can withdraw accumulated rewards',
                  'Withdraw rewards anytime after eligibility',
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
        <div className="space-y-8 mb-12">
          <InviteAndEarnCard />
          <CollectRewardsCard />
        </div>
        {/* User Invitations */}
        {activeAccount && (
          <div className="mb-12">
            <h3 className="text-xl md:text-2xl font-bold m-0 mb-6 text-white">
              Your Invitations
            </h3>
            <InvitationList />
          </div>
        )}

        {/* ========== Disclaimer ========== */}
        <div className="border-t border-white/10 mt-10 pt-6 pb-8">
          <p className="text-xs text-white/50 leading-relaxed m-0">
            {DISCLAIMER_TEXT}
          </p>
        </div>
      </div>
    </Shell>
  );
}
