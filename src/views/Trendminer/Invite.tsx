import { useState } from "react";
import AuroraBackground from "../../features/trending/components/Invitation/graphics/AuroraBackground";
import { 
  CollectRewardsCard, 
  InvitationList, 
  InviteAndEarnCard,
  StepGuide,
  EarningExplanation,
  StatsSection
} from "../../features/trending/components/Invitation";
import Shell from "../../components/layout/Shell";
import { useAeSdk } from "../../hooks";
import { useInvitations } from "../../features/trending/hooks/useInvitations";
import NetworkVisualization from "../../features/trending/components/Invitation/graphics/NetworkVisualization";
import EarningFlow from "../../features/trending/components/Invitation/graphics/EarningFlow";

export default function Invite() {
  const { activeAccount } = useAeSdk();
  const { invitations } = useInvitations();
  const [showStepGuide, setShowStepGuide] = useState<boolean>(() => {
    try {
      return localStorage.getItem("invite_step_guide_dismissed") !== "1";
    } catch {
      return true;
    }
  });

  // Aurora background customization state
  const [auroraConfig, setAuroraConfig] = useState({
    colorStops: ["#3A29FF", "#FF94B4", "#FF3232"] as [string, string, string],
    speed: 1.0,
    blend: 0.5,
    amplitude: 1.0,
  });

  const handleDismissStepGuide = () => {
    try {
      localStorage.setItem("invite_step_guide_dismissed", "1");
    } catch {}
    setShowStepGuide(false);
  };

  const inviteCount = invitations?.length || 0;

  return (
    <Shell>
      <div className="mx-auto px-4 py-4 sm:py-6 max-w-7xl relative">
        {/* Hero Section - Redesigned */}
        <div className="text-center mb-8 sm:mb-12 py-6 sm:py-8 relative overflow-hidden rounded-3xl">
          {/* Aurora Background - Only behind hero section */}
          <AuroraBackground 
            colorStops={auroraConfig.colorStops}
            speed={auroraConfig.speed}
            blend={auroraConfig.blend}
            amplitude={auroraConfig.amplitude}
            className="absolute inset-0 rounded-3xl"
          />
          
          {/* Customization Controls */}
          <div className="absolute top-4 right-4 z-20 bg-black/80 backdrop-blur-md border border-white/20 rounded-lg p-4 min-w-[200px]">
            <h3 className="text-white font-bold mb-4 text-sm">Customize</h3>
            
            {/* Colors */}
            <div className="mb-4">
              <p className="text-white/70 text-xs mb-2">Colors</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-white/70 text-xs w-12">Color 1</label>
                  <input
                    type="color"
                    value={auroraConfig.colorStops[0]}
                    onChange={(e) =>
                      setAuroraConfig({
                        ...auroraConfig,
                        colorStops: [e.target.value, auroraConfig.colorStops[1], auroraConfig.colorStops[2]],
                      })
                    }
                    className="flex-1 h-8 rounded cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-white/70 text-xs w-12">Color 2</label>
                  <input
                    type="color"
                    value={auroraConfig.colorStops[1]}
                    onChange={(e) =>
                      setAuroraConfig({
                        ...auroraConfig,
                        colorStops: [auroraConfig.colorStops[0], e.target.value, auroraConfig.colorStops[2]],
                      })
                    }
                    className="flex-1 h-8 rounded cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-white/70 text-xs w-12">Color 3</label>
                  <input
                    type="color"
                    value={auroraConfig.colorStops[2]}
                    onChange={(e) =>
                      setAuroraConfig({
                        ...auroraConfig,
                        colorStops: [auroraConfig.colorStops[0], auroraConfig.colorStops[1], e.target.value],
                      })
                    }
                    className="flex-1 h-8 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
            
            {/* Speed */}
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <label className="text-white/70 text-xs">Speed</label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={auroraConfig.speed}
                  onChange={(e) =>
                    setAuroraConfig({
                      ...auroraConfig,
                      speed: parseFloat(e.target.value),
                    })
                  }
                  className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-white text-xs w-8 text-right">{auroraConfig.speed.toFixed(1)}</span>
              </div>
            </div>
            
            {/* Blend */}
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <label className="text-white/70 text-xs">Blend</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={auroraConfig.blend}
                  onChange={(e) =>
                    setAuroraConfig({
                      ...auroraConfig,
                      blend: parseFloat(e.target.value),
                    })
                  }
                  className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-white text-xs w-8 text-right">{auroraConfig.blend.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <div className="relative z-10">
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold m-0 leading-tight mb-4">
              <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
                Invite & Earn
              </span>
            </h1>
            <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl text-slate-300 font-bold mb-6">
              Earn up to <span className="bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">0.5%</span> of Every Token Purchase
            </div>
            <p className="text-base sm:text-lg md:text-xl text-slate-400 max-w-3xl mx-auto mb-8">
              Invite friends to join the platform. When they buy trend tokens, you automatically earn a percentage of their purchases. Simple, transparent, rewarding.
            </p>
            
            {/* Quick Stats */}
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 mb-8">
              <div className="flex flex-col items-center">
                <div className="text-3xl sm:text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                  Up to 0.5%
                </div>
                <div className="text-xs sm:text-sm text-slate-400 mt-1">Commission Rate</div>
              </div>
              <div className="w-px h-12 bg-white/20" />
              <div className="flex flex-col items-center">
                <div className="text-3xl sm:text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  4+
                </div>
                <div className="text-xs sm:text-sm text-slate-400 mt-1">Invitees Needed</div>
              </div>
              <div className="w-px h-12 bg-white/20" />
              <div className="flex flex-col items-center">
                <div className="text-3xl sm:text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-blue-400 to-teal-400 bg-clip-text text-transparent">
                  ∞
                </div>
                <div className="text-xs sm:text-sm text-slate-400 mt-1">Earning Potential</div>
              </div>
            </div>
          </div>
        </div>

        {/* Step Guide */}
        {showStepGuide && (
          <div className="mb-8 sm:mb-12">
            <StepGuide onDismiss={handleDismissStepGuide} />
          </div>
        )}

        {/* Earning Explanation */}
        <div className="mb-8 sm:mb-12">
          <EarningExplanation />
        </div>

        {/* Earning Flow Visualization */}
        <div className="mb-8 sm:mb-12">
          <EarningFlow />
        </div>

        {/* Network Visualization */}
        {activeAccount && inviteCount > 0 && (
          <div className="mb-8 sm:mb-12">
            <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-[20px] rounded-[20px] p-6 sm:p-8 transition-all duration-300 hover:border-white/15 hover:shadow-[0_8px_32px_rgba(0,0,0,0.3),0_2px_8px_rgba(0,0,0,0.2)]">
              <h3 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent text-center mb-6">
                Your Invite Network
              </h3>
              <NetworkVisualization inviteCount={inviteCount} />
            </div>
          </div>
        )}

        {/* Main Action Cards */}
        <div className="space-y-8 sm:space-y-12 mb-12">
          {/* Generate Invites Card */}
          <InviteAndEarnCard />
          {/* Rewards Card */}
          <CollectRewardsCard />
        </div>

        {/* Stats Section (when API is ready) */}
        <div className="mb-12">
          <StatsSection />
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
