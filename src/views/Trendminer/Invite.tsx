import { useState } from "react";
import CollectRewardsCard from "../../components/Invitation/CollectRewardsCard";
import InvitationList from "../../components/Invitation/InvitationList";
import InviteAndEarnCard from "../../components/Invitation/InviteAndEarnCard";
import RightRail from "../../components/layout/RightRail";
import Shell from "../../components/layout/Shell";
import { useAeSdk } from "../../hooks";
export default function Invite() {
  const { activeAccount } = useAeSdk();
  const [showInfo, setShowInfo] = useState<boolean>(() => {
    try {
      return localStorage.getItem("invite_info_dismissed") !== "1";
    } catch {
      return true;
    }
  });

  return (
    <Shell>
      <div className="mx-auto px-4 py-2">
        {/* Hero Section */}
        <div className="text-center mb-4 py-2">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold m-0 leading-tight">
            <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
              Invite & Earn
            </span>
            <div className="text-base md:text-lg lg:text-xl text-slate-400 mt-2 font-normal">
              Build your network, earn rewards
            </div>
          </h1>
        </div>
        {/* Info Card */}
        {showInfo && (
          <div className="mb-8 bg-black/20 backdrop-blur-lg border border-white/10 rounded-2xl p-6 relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-px before:bg-gradient-to-r before:from-pink-400 before:via-purple-400 before:to-blue-400 before:opacity-30">
            <div className="flex items-start gap-6 relative z-10 flex-wrap">
              <div className="text-3xl md:text-4xl lg:text-5xl flex-shrink-0 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
                💡
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="m-0 mb-6 text-2xl md:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent break-words">
                  How it works
                </h3>
                <div className="grid gap-5">
                  <div className="flex items-start gap-5 p-3 rounded-xl transition-all duration-300 hover:bg-white/3 hover:translate-x-1 flex-wrap">
                    <div className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center font-bold text-white flex-shrink-0 shadow-lg shadow-pink-500/30 relative after:content-[''] after:absolute after:inset-[-2px] after:rounded-full after:bg-gradient-to-r after:from-pink-500 after:to-purple-500 after:opacity-30 after:z-[-1] after:animate-pulse text-sm md:text-base">
                      1
                    </div>
                    <div className="text-slate-400 leading-relaxed text-sm md:text-base flex-1 min-w-0 break-words">
                      Generate invite links by staking AE per invite
                    </div>
                  </div>
                  <div className="flex items-start gap-5 p-3 rounded-xl transition-all duration-300 hover:bg-white/3 hover:translate-x-1 flex-wrap">
                    <div className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center font-bold text-white flex-shrink-0 shadow-lg shadow-pink-500/30 relative after:content-[''] after:absolute after:inset-[-2px] after:rounded-full after:bg-gradient-to-r after:from-pink-500 after:to-purple-500 after:opacity-30 after:z-[-1] after:animate-pulse text-sm md:text-base">
                      2
                    </div>
                    <div className="text-slate-400 leading-relaxed text-sm md:text-base flex-1 min-w-0 break-words">
                      Share links with friends and community
                    </div>
                  </div>
                  <div className="flex items-start gap-5 p-3 rounded-xl transition-all duration-300 hover:bg-white/3 hover:translate-x-1 flex-wrap">
                    <div className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center font-bold text-white flex-shrink-0 shadow-lg shadow-pink-500/30 relative after:content-[''] after:absolute after:inset-[-2px] after:rounded-full after:bg-gradient-to-r after:from-pink-500 after:to-purple-500 after:opacity-30 after:z-[-1] after:animate-pulse text-sm md:text-base">
                      3
                    </div>
                    <div className="text-slate-400 leading-relaxed text-sm md:text-base flex-1 min-w-0 break-words">
                      When 4+ invitees purchase tokens, earn rewards
                    </div>
                  </div>
                  <div className="flex items-start gap-5 p-3 rounded-xl transition-all duration-300 hover:bg-white/3 hover:translate-x-1 flex-wrap">
                    <div className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center font-bold text-white flex-shrink-0 shadow-lg shadow-pink-500/30 relative after:content-[''] after:absolute after:inset-[-2px] after:rounded-full after:bg-gradient-to-r after:from-pink-500 after:to-purple-500 after:opacity-30 after:z-[-1] after:animate-pulse text-sm md:text-base">
                      4
                    </div>
                    <div className="text-slate-400 leading-relaxed text-sm md:text-base flex-1 min-w-0 break-words">
                      Withdraw rewards anytime after eligibility
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  try {
                    localStorage.setItem("invite_info_dismissed", "1");
                  } catch { }
                  setShowInfo(false);
                }}
                className="bg-white/10 border border-white/20 text-white text-base md:text-lg lg:text-xl cursor-pointer p-3 rounded-xl transition-all duration-300 flex-shrink-0 min-w-10 min-h-10 md:min-w-12 md:min-h-12 lg:min-w-14 lg:min-h-14 flex items-center justify-center backdrop-blur-lg hover:bg-pink-500/20 hover:border-pink-400 hover:text-pink-400 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-pink-500/30 active:translate-y-0"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        {/* Main Action Cards */}
        <div className="space-y-8 mb-12">
          {/* Generate Invites Card */}
          <InviteAndEarnCard />
          {/* Rewards Card */}
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
      </div>
    </Shell>
  );
}
