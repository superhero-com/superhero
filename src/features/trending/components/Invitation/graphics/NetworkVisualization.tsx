import { useState, useEffect } from "react";

interface NetworkVisualizationProps {
  inviteCount?: number;
  className?: string;
}

export default function NetworkVisualization({ inviteCount = 0, className }: NetworkVisualizationProps) {
  const [animatedNodes, setAnimatedNodes] = useState<number[]>([]);

  useEffect(() => {
    // Animate nodes appearing
    const nodes = Math.min(inviteCount || 5, 12);
    const interval = setInterval(() => {
      setAnimatedNodes((prev) => {
        if (prev.length < nodes) {
          return [...prev, prev.length];
        }
        return prev;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [inviteCount]);

  const nodes = Math.min(inviteCount || 5, 12);
  const centerX = 50;
  const centerY = 50;
  const radius = 35;

  return (
    <div className={`relative ${className || ""}`}>
      <div className="relative w-full aspect-square max-w-md mx-auto">
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Center node (You) */}
          <circle
            cx={centerX}
            cy={centerY}
            r="6"
            fill="url(#centerGradient)"
            className="animate-pulse"
          >
            <animate
              attributeName="r"
              values="6;8;6"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
          <text
            x={centerX}
            y={centerY + 12}
            textAnchor="middle"
            className="text-xs fill-white font-bold"
          >
            You
          </text>

          {/* Network nodes */}
          {Array.from({ length: nodes }).map((_, i) => {
            const angle = (i * 2 * Math.PI) / nodes;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            const isAnimated = animatedNodes.includes(i);

            return (
              <g key={i} opacity={isAnimated ? 1 : 0}>
                {/* Connection line */}
                <line
                  x1={centerX}
                  y1={centerY}
                  x2={x}
                  y2={y}
                  stroke="url(#lineGradient)"
                  strokeWidth="0.5"
                  opacity="0.3"
                  className="transition-opacity duration-500"
                />
                {/* Node */}
                <circle
                  cx={x}
                  cy={y}
                  r="3"
                  fill="url(#nodeGradient)"
                  className="transition-all duration-500"
                >
                  <animate
                    attributeName="r"
                    values="3;4;3"
                    dur="2s"
                    begin={`${i * 0.1}s`}
                    repeatCount="indefinite"
                  />
                </circle>
              </g>
            );
          })}

          {/* Gradients */}
          <defs>
            <linearGradient id="centerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ec4899" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
            <linearGradient id="nodeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#14b8a6" />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ec4899" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.5" />
            </linearGradient>
          </defs>
        </svg>

        {/* Stats overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/5 backdrop-blur-sm rounded-b-xl border-t border-white/10">
          <div className="text-center">
            <div className="text-xs text-slate-400 mb-1">Your Network</div>
            <div className="text-lg font-bold bg-gradient-to-r from-pink-400 to-blue-400 bg-clip-text text-transparent">
              {inviteCount || 0} Invitees
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

