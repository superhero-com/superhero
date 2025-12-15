import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { miniAppRegistry } from '../registry';
import type { MiniAppCategory } from '../types';
import { HeaderLogo } from '@/icons';

const categoryLabels: Record<MiniAppCategory, string> = {
  trading: 'Trading',
  bridge: 'Bridge',
  explore: 'Explore',
  community: 'Community',
  utility: 'Utility',
};

const categoryIcons: Record<MiniAppCategory, string> = {
  trading: '💹',
  bridge: '🌉',
  explore: '🔍',
  community: '👥',
  utility: '🛠️',
};

export default function MiniAppsLanding() {
  const navigate = useNavigate();

  const allApps = miniAppRegistry.getAllMetadata();
  
  const groupedApps = allApps.reduce((acc, app) => {
    if (!acc[app.category]) {
      acc[app.category] = [];
    }
    acc[app.category].push(app);
    return acc;
  }, {} as Record<MiniAppCategory, typeof allApps>);

  return (
    <div className="w-full pb-4 md:pb-6">
      {/* Header with Superhero Logo - Hidden on 2xl+ when left rail is shown */}
      <div className="mb-2 2xl:hidden">
        <div className="flex items-center justify-between gap-2">
          <Link to="/" className="flex items-center no-underline hover:no-underline group" aria-label="Superhero Home">
            <HeaderLogo className="h-8 w-auto transition-transform duration-200 group-hover:scale-105" />
          </Link>
          <div className="flex items-center h-[52px] justify-end">
            <button
              onClick={() => navigate('/apps')}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors cursor-pointer text-xs font-semibold text-white/80 hover:text-white"
              aria-label="More mini apps"
            >
              More mini apps
            </button>
          </div>
        </div>
      </div>
      {/* Main Content - wrapped in card */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-xl w-full max-w-full" style={{ boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)' }}>
        <div className="p-3 sm:p-4 md:p-5 lg:p-6 xl:p-8 w-full max-w-full overflow-x-hidden">
          {/* Title and Description */}
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
                  <span className="text-2xl">{categoryIcons[category as MiniAppCategory]}</span>
                  {categoryLabels[category as MiniAppCategory]}
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
                          {typeof app.icon === 'string' ? app.icon : <app.icon className="w-8 h-8" />}
                        </div>
                        
                        {/* Content */}
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-xl font-bold text-white group-hover:text-[var(--neon-teal)] transition-colors duration-300">
                            {app.name}
                          </h3>
                          {!app.builtIn && app.author && (
                            <span className="text-xs text-white/40 ml-2">by {app.author}</span>
                          )}
                        </div>
                        <p className="text-sm text-white/60 mb-4 flex-grow">
                          {app.description}
                        </p>
                        
                        {/* Tags */}
                        {app.tags && app.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-4">
                            {app.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-white/60"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        
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
                Register your mini-app using our plugin system - no fork required!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
                <a
                  href="/docs/mini-apps"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 bg-white/5 text-white font-semibold hover:bg-white/10 transition-all duration-300"
                >
                  📚 Documentation
                </a>
              </div>
            </GlassSurface>
          </div>
        </div>
      </div>
    </div>
  );
}


