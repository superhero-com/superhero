import { useState } from "react";
import { ChevronRight } from "lucide-react";

interface Step {
  number: number;
  title: string;
  description: string;
  icon: string;
}

const steps: Step[] = [
  {
    number: 1,
    title: "Generate Invite Links",
    description: "Stake AE tokens to create unique invite links. Each invite requires a small amount of AE.",
    icon: "🔗",
  },
  {
    number: 2,
    title: "Share with Friends",
    description: "Send your invite links to friends, community members, or anyone interested in trend tokens.",
    icon: "📤",
  },
  {
    number: 3,
    title: "They Buy Tokens",
    description: "When your invitees purchase trend tokens, you automatically earn a percentage of their buy amount.",
    icon: "💎",
  },
  {
    number: 4,
    title: "Collect Rewards",
    description: "Once 4+ invitees have purchased tokens, withdraw your accumulated rewards anytime.",
    icon: "💰",
  },
];

interface StepGuideProps {
  onDismiss?: () => void;
}

export default function StepGuide({ onDismiss }: StepGuideProps) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  return (
    <div className="bg-gradient-to-br from-black/40 via-black/30 to-black/40 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-10 relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-pink-500/5 via-purple-500/5 to-blue-500/5 animate-pulse pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-pink-400/50 to-transparent" />
      
      {/* Close button */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-lg cursor-pointer p-2 w-8 h-8 sm:w-10 sm:h-10 rounded-lg transition-all duration-300 flex items-center justify-center backdrop-blur-lg hover:border-pink-400 hover:text-pink-400 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-pink-500/30 active:translate-y-0 z-20"
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start gap-4 mb-8">
          <div className="text-4xl sm:text-5xl md:text-6xl flex-shrink-0 drop-shadow-[0_0_15px_rgba(255,255,255,0.4)] animate-bounce">
            🚀
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="m-0 mb-2 text-2xl sm:text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent break-words">
              How It Works
            </h3>
            <p className="text-sm sm:text-base text-slate-400 mt-2">
              Follow these simple steps to start earning rewards
            </p>
          </div>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {steps.map((step, index) => {
            const isExpanded = expandedStep === step.number;
            return (
              <div
                key={step.number}
                onClick={() => setExpandedStep(isExpanded ? null : step.number)}
                className={`group relative bg-white/5 hover:bg-white/10 border border-white/10 hover:border-pink-400/50 rounded-xl sm:rounded-2xl p-5 sm:p-6 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-pink-500/20 ${
                  isExpanded ? "bg-white/10 border-pink-400/50 shadow-lg shadow-pink-500/20" : ""
                }`}
              >
                {/* Step Number Badge */}
                <div className="flex items-start gap-4 mb-3">
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 flex items-center justify-center font-bold text-white text-lg sm:text-xl md:text-2xl shadow-lg shadow-pink-500/40 relative z-10">
                      {step.number}
                    </div>
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 opacity-30 blur-md animate-pulse" />
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl sm:text-3xl">{step.icon}</span>
                      <h4 className="m-0 text-lg sm:text-xl md:text-2xl font-bold text-white break-words">
                        {step.title}
                      </h4>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0 md:max-h-20 md:opacity-100"
                  }`}
                >
                  <p className="text-sm sm:text-base text-slate-300 leading-relaxed mt-2">
                    {step.description}
                  </p>
                </div>

                {/* Expand indicator for mobile */}
                <div className="md:hidden flex items-center justify-end mt-3 text-pink-400">
                  <ChevronRight
                    className={`w-5 h-5 transition-transform duration-300 ${
                      isExpanded ? "rotate-90" : ""
                    }`}
                  />
                </div>

                {/* Connecting line (desktop only) */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-0.5 bg-gradient-to-r from-purple-500 to-transparent z-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* Call to Action */}
        <div className="mt-8 p-4 sm:p-6 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-blue-500/10 rounded-xl sm:rounded-2xl border border-pink-400/20 text-center">
          <p className="text-sm sm:text-base text-white font-medium mb-0">
            <span className="text-pink-400 font-bold">Ready to start earning?</span> Generate your first invite link below!
          </p>
        </div>
      </div>
    </div>
  );
}

