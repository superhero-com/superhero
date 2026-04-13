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

const DISCLAIMER_TEXT = `The Superhero reward program rewards users for creating content on other social media platforms (like X) with backlinks and/or invite links, referring new users to the platform. Rewards will be distributed in the form of ae tokens. Eligibility and rewards depend on on-chain activity, are not guaranteed and can be paused at any time without notice or liability. The right is reserved to disqualify any user from the program. Users from blacklisted countries are not eligible for rewards. By participating in the program, users agree to these terms and conditions. Rewards sent may be subject to tax reporting. Users are responsible for any tax obligations arising from receiving rewards.`;

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

        {/* ========== Separator + Trading Affiliate Program header ========== */}
        <div className="border-t border-white/10 my-10" />

        <div className="mb-8">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold m-0 text-white">
            Trading Affiliate Program
          </h2>
        </div>

        {/* Info Card (existing, dismissible) */}
        {showInfo && (
          <div className="mb-6 sm:mb-8 bg-black/20 backdrop-blur-lg border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-px before:bg-gradient-to-r before:from-pink-400 before:via-purple-400 before:to-blue-400 before:opacity-30">
            <button
              onClick={() => {
                try {
                  localStorage.setItem('invite_info_dismissed', '1');
                } catch { }
                setShowInfo(false);
              }}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-white/10 border border-white/20 text-white text-lg sm:text-xl cursor-pointer p-2 sm:p-2.5 w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl transition-all duration-300 flex items-center justify-center backdrop-blur-lg hover:bg-pink-500/20 hover:border-pink-400 hover:text-pink-400 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-pink-500/30 active:translate-y-0 z-20"
              aria-label="Dismiss"
            >
              ✕
            </button>

            <div className="flex items-start gap-3 sm:gap-4 md:gap-5 relative z-10 pr-10 sm:pr-12">
              <div className="text-2xl sm:text-3xl md:text-4xl flex-shrink-0 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                💡
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="m-0 mb-4 sm:mb-5 md:mb-6 text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent break-words">
                  How it works
                </h3>
                <div className="grid gap-3 sm:gap-4">
                  <div className="flex items-start gap-3 sm:gap-4 p-2 sm:p-2.5 md:p-3 rounded-lg sm:rounded-xl transition-all duration-300 hover:bg-white/3 hover:translate-x-1">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center font-bold text-white flex-shrink-0 shadow-lg shadow-pink-500/30 relative after:content-[''] after:absolute after:inset-[-2px] after:rounded-full after:bg-gradient-to-r after:from-pink-500 after:to-purple-500 after:opacity-30 after:z-[-1] after:animate-pulse text-xs sm:text-sm md:text-base">
                      1
                    </div>
                    <div className="text-slate-400 leading-relaxed text-xs sm:text-sm md:text-base flex-1 min-w-0 break-words pt-0.5">
                      Generate invite links by funding a one-time AE reward per invite
                    </div>
                  </div>
                  <div className="flex items-start gap-3 sm:gap-4 p-2 sm:p-2.5 md:p-3 rounded-lg sm:rounded-xl transition-all duration-300 hover:bg-white/3 hover:translate-x-1">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center font-bold text-white flex-shrink-0 shadow-lg shadow-pink-500/30 relative after:content-[''] after:absolute after:inset-[-2px] after:rounded-full after:bg-gradient-to-r after:from-pink-500 after:to-purple-500 after:opacity-30 after:z-[-1] after:animate-pulse text-xs sm:text-sm md:text-base">
                      2
                    </div>
                    <div className="text-slate-400 leading-relaxed text-xs sm:text-sm md:text-base flex-1 min-w-0 break-words pt-0.5">
                      Share links with friends and community
                    </div>
                  </div>
                  <div className="flex items-start gap-3 sm:gap-4 p-2 sm:p-2.5 md:p-3 rounded-lg sm:rounded-xl transition-all duration-300 hover:bg-white/3 hover:translate-x-1">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center font-bold text-white flex-shrink-0 shadow-lg shadow-pink-500/30 relative after:content-[''] after:absolute after:inset-[-2px] after:rounded-full after:bg-gradient-to-r after:from-pink-500 after:to-purple-500 after:opacity-30 after:z-[-1] after:animate-pulse text-xs sm:text-sm md:text-base">
                      3
                    </div>
                    <div className="text-slate-400 leading-relaxed text-xs sm:text-sm md:text-base flex-1 min-w-0 break-words pt-0.5">
                      After 4 unique invitees buy tokens, you can withdraw accumulated rewards
                    </div>
                  </div>
                  <div className="flex items-start gap-3 sm:gap-4 p-2 sm:p-2.5 md:p-3 rounded-lg sm:rounded-xl transition-all duration-300 hover:bg-white/3 hover:translate-x-1">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center font-bold text-white flex-shrink-0 shadow-lg shadow-pink-500/30 relative after:content-[''] after:absolute after:inset-[-2px] after:rounded-full after:bg-gradient-to-r after:from-pink-500 after:to-purple-500 after:opacity-30 after:z-[-1] after:animate-pulse text-xs sm:text-sm md:text-base">
                      4
                    </div>
                    <div className="text-slate-400 leading-relaxed text-xs sm:text-sm md:text-base flex-1 min-w-0 break-words pt-0.5">
                      Withdraw rewards anytime after eligibility
                    </div>
                  </div>
                </div>
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
            <h3 className="text-3xl md:text-4xl lg:text-5xl font-extrabold m-0 mb-8 bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent text-center break-words">
              Your Invitations
            </h3>
            <InvitationList />
          </div>
        )}

        {/* ========== Disclaimer ========== */}
        <div className="border-t border-white/10 mt-10 pt-6 pb-8">
          <p className="text-xs text-white/30 leading-relaxed m-0">
            {DISCLAIMER_TEXT}
          </p>
        </div>
      </div>
    </Shell>
  );
}
