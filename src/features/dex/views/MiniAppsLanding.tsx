import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassSurface } from '@/components/ui/GlassSurface';

interface MiniApp {
  id: string;
  name: string;
  description: string;
  icon: string;
  path: string;
  category: 'trading' | 'bridge' | 'explore';
  gradient: string;
}

const miniApps: MiniApp[] = [
  {
    id: 'swap',
    name: 'Swap',
    description: 'Trade any supported AEX-9 tokens instantly',
    icon: '🔄',
    path: '/apps/swap',
    category: 'trading',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'pool',
    name: 'Pool',
    description: 'Manage liquidity positions and earn fees',
    icon: '💧',
    path: '/apps/pool',
    category: 'trading',
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'wrap',
    name: 'Wrap',
    description: 'Convert AE ↔ WAE seamlessly',
    icon: '📦',
    path: '/apps/wrap',
    category: 'trading',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    id: 'bridge',
    name: 'Bridge',
    description: 'Bridge tokens between Ethereum and æternity',
    icon: '🌉',
    path: '/apps/bridge',
    category: 'bridge',
    gradient: 'from-orange-500 to-red-500',
  },
  {
    id: 'buy-ae',
    name: 'Buy AE',
    description: 'Buy AE tokens with ETH',
    icon: '💎',
    path: '/apps/buy-ae-with-eth',
    category: 'bridge',
    gradient: 'from-yellow-500 to-amber-500',
  },
  {
    id: 'explorer',
    name: 'Explorer',
    description: 'Browse tokens, pools, and transactions',
    icon: '🔍',
    path: '/apps/explore/tokens',
    category: 'explore',
    gradient: 'from-indigo-500 to-blue-500',
  },
];

const categoryLabels = {
  trading: 'Trading',
  bridge: 'Bridge',
  explore: 'Explore',
};

export default function MiniAppsLanding() {
  const navigate = useNavigate();

  const groupedApps = miniApps.reduce((acc, app) => {
    if (!acc[app.category]) {
      acc[app.category] = [];
    }
    acc[app.category].push(app);
    return acc;
  }, {} as Record<string, MiniApp[]>);

  return (
    <div className="min-h-screen w-full py-8 px-4 md:px-6">
      <div className="w-full">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            Mini-Apps
          </h1>
          <p className="text-lg text-white/70 max-w-2xl">
            Discover powerful DeFi tools and utilities built on æternity. Each mini-app is designed to be fast, secure, and easy to use.
          </p>
        </div>

        {/* Mini-Apps Grid */}
        <div className="space-y-8 md:space-y-12">
          {Object.entries(groupedApps).map(([category, apps]) => (
            <div key={category}>
              <h2 className="text-xl md:text-2xl font-semibold text-white mb-4 md:mb-6 flex items-center gap-2">
                <span className="text-2xl">{category === 'trading' ? '💹' : category === 'bridge' ? '🌉' : '🔍'}</span>
                {categoryLabels[category as keyof typeof categoryLabels]}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {apps.map((app) => (
                  <GlassSurface
                    key={app.id}
                    className="p-6 cursor-pointer group hover:scale-[1.02] transition-all duration-300"
                    onClick={() => navigate(app.path)}
                    interactive
                  >
                    <div className="flex flex-col h-full">
                      {/* Icon */}
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${app.gradient} flex items-center justify-center text-3xl mb-4 shadow-lg group-hover:shadow-xl transition-shadow duration-300`}>
                        {app.icon}
                      </div>
                      
                      {/* Content */}
                      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[var(--neon-teal)] transition-colors duration-300">
                        {app.name}
                      </h3>
                      <p className="text-sm text-white/60 mb-4 flex-grow">
                        {app.description}
                      </p>
                      
                      {/* Arrow */}
                      <div className="flex items-center text-[var(--neon-teal)] text-sm font-medium group-hover:gap-2 transition-all duration-300">
                        <span>Open app</span>
                        <svg 
                          className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-300" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </GlassSurface>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="mt-12 md:mt-16">
          <GlassSurface className="p-6 md:p-8 text-center">
            <h3 className="text-2xl font-bold text-white mb-2">
              Build Your Own Mini-App
            </h3>
            <p className="text-white/60 mb-6 max-w-2xl mx-auto">
              Have an idea for a mini-app? Join our developer community and build on æternity.
            </p>
            <a
              href="https://github.com/superhero-com/superhero"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[var(--neon-teal)] to-[var(--neon-blue)] text-black font-bold hover:shadow-lg hover:scale-105 transition-all duration-300"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              View on GitHub
            </a>
          </GlassSurface>
        </div>
      </div>
    </div>
  );
}

