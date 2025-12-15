import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { ArrowLeft } from 'lucide-react';

export default function MiniAppsDocs() {
  const navigate = useNavigate();

  return (
    <div className="w-full py-4 md:py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => navigate('/apps')}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Mini-Apps Documentation</h1>
            <p className="text-sm text-white/60">Learn how to build and register your own mini-apps</p>
          </div>
        </div>
      </div>

      {/* Documentation Content */}
      <GlassSurface className="p-6 md:p-8">
        <div className="prose prose-invert max-w-none">
          <h2 className="text-xl font-bold text-white mb-4">Overview</h2>
          <p className="text-white/80 mb-6">
            The Superhero platform includes a powerful plugin system that allows community developers to easily create and register their own mini-apps without forking the main repository.
          </p>
          <p className="text-white/80 mb-6">
            Mini-apps are self-contained applications that integrate seamlessly into the Superhero platform. They appear in the <code className="px-2 py-1 bg-white/10 rounded text-sm">/apps</code> directory and are automatically listed on the Mini-Apps landing page.
          </p>

          <h2 className="text-xl font-bold text-white mb-4 mt-8">Quick Start</h2>
          
          <h3 className="text-lg font-semibold text-white mb-3 mt-6">1. Create Your Mini-App Component</h3>
          <p className="text-white/80 mb-4">Create a React component for your mini-app:</p>
          <pre className="bg-white/5 border border-white/10 rounded-lg p-4 overflow-x-auto mb-6">
            <code className="text-sm text-white/90">{`// src/features/my-app/MyApp.tsx
import React from 'react';

export default function MyApp() {
  return (
    <div className="w-full pb-4 md:py-6">
      {/* Your app content */}
      <h1>My Custom Mini-App</h1>
    </div>
  );
}`}</code>
          </pre>

          <h3 className="text-lg font-semibold text-white mb-3 mt-6">2. Register Your Mini-App</h3>
          <p className="text-white/80 mb-4">Create a plugin file and register your app:</p>
          <pre className="bg-white/5 border border-white/10 rounded-lg p-4 overflow-x-auto mb-6">
            <code className="text-sm text-white/90">{`// src/features/my-app/plugin.ts
import { lazy } from 'react';
import { registerMiniApp } from '@/features/mini-apps';

registerMiniApp({
  metadata: {
    id: 'my-app',
    name: 'My App',
    description: 'A cool mini-app built by the community',
    icon: '🚀',
    path: '/apps/my-app',
    category: 'utility',
    gradient: 'from-purple-500 to-pink-500',
    author: 'Your Name',
    authorUrl: 'https://github.com/yourusername',
    version: '1.0.0',
    tags: ['utility', 'community'],
  },
  route: {
    path: '/apps/my-app',
    component: lazy(() => import('./MyApp')),
  },
});`}</code>
          </pre>

          <h3 className="text-lg font-semibold text-white mb-3 mt-6">3. Import Your Plugin</h3>
          <p className="text-white/80 mb-4">Add your plugin import to the plugins file:</p>
          <pre className="bg-white/5 border border-white/10 rounded-lg p-4 overflow-x-auto mb-6">
            <code className="text-sm text-white/90">{`// src/features/mini-apps/plugins.ts
import { registerBuiltInMiniApps } from './built-in';
import './my-app/plugin'; // Add this line`}</code>
          </pre>

          <h2 className="text-xl font-bold text-white mb-4 mt-8">Plugin Structure</h2>

          <h3 className="text-lg font-semibold text-white mb-3 mt-6">Metadata</h3>
          <p className="text-white/80 mb-4">The <code className="px-2 py-1 bg-white/10 rounded text-sm">metadata</code> object defines how your mini-app appears in the UI:</p>
          <ul className="list-disc list-inside text-white/80 mb-6 space-y-2 ml-4">
            <li><strong className="text-white">id</strong>: Unique identifier (required)</li>
            <li><strong className="text-white">name</strong>: Display name (required)</li>
            <li><strong className="text-white">description</strong>: Short description shown on the landing page (required)</li>
            <li><strong className="text-white">icon</strong>: Emoji string or React component (required)</li>
            <li><strong className="text-white">path</strong>: Route path (required, should start with <code className="px-1 py-0.5 bg-white/10 rounded text-xs">/apps/</code>)</li>
            <li><strong className="text-white">category</strong>: One of <code className="px-1 py-0.5 bg-white/10 rounded text-xs">'trading' | 'bridge' | 'explore' | 'community' | 'utility'</code> (required)</li>
            <li><strong className="text-white">gradient</strong>: Tailwind gradient classes for icon background (required)</li>
            <li><strong className="text-white">author</strong>: Your name (optional)</li>
            <li><strong className="text-white">authorUrl</strong>: Your GitHub/profile URL (optional)</li>
            <li><strong className="text-white">version</strong>: Version string (optional)</li>
            <li><strong className="text-white">tags</strong>: Array of tags for filtering (optional)</li>
            <li><strong className="text-white">requiresAuth</strong>: Whether the app requires authentication (optional)</li>
          </ul>

          <h3 className="text-lg font-semibold text-white mb-3 mt-6">Route Configuration</h3>
          <p className="text-white/80 mb-4">The <code className="px-2 py-1 bg-white/10 rounded text-sm">route</code> object defines how your app is routed:</p>
          <ul className="list-disc list-inside text-white/80 mb-6 space-y-2 ml-4">
            <li><strong className="text-white">path</strong>: Route path pattern (required)</li>
            <li><strong className="text-white">component</strong>: Lazy-loaded React component (required)</li>
            <li><strong className="text-white">layout</strong>: Custom layout wrapper (optional, defaults to <code className="px-1 py-0.5 bg-white/10 rounded text-xs">SocialLayout</code>)</li>
            <li><strong className="text-white">options</strong>: Additional route options (optional)</li>
          </ul>

          <h2 className="text-xl font-bold text-white mb-4 mt-8">Best Practices</h2>
          <ul className="list-disc list-inside text-white/80 mb-6 space-y-2 ml-4">
            <li><strong className="text-white">Use lazy loading</strong>: Always use <code className="px-1 py-0.5 bg-white/10 rounded text-xs">lazy()</code> for your component imports to enable code splitting</li>
            <li><strong className="text-white">Follow naming conventions</strong>: Use kebab-case for IDs and paths</li>
            <li><strong className="text-white">Provide good descriptions</strong>: Help users understand what your app does</li>
            <li><strong className="text-white">Use appropriate categories</strong>: Choose the category that best fits your app</li>
            <li><strong className="text-white">Add tags</strong>: Tags help users discover your app</li>
            <li><strong className="text-white">Test your routes</strong>: Make sure your route paths don't conflict with existing routes</li>
            <li><strong className="text-white">Handle errors gracefully</strong>: Use error boundaries and proper error handling</li>
          </ul>

          <h2 className="text-xl font-bold text-white mb-4 mt-8">Integration Points</h2>
          
          <h3 className="text-lg font-semibold text-white mb-3 mt-6">Using Platform Features</h3>
          <p className="text-white/80 mb-4">Your mini-app can access platform features through hooks and context:</p>
          <pre className="bg-white/5 border border-white/10 rounded-lg p-4 overflow-x-auto mb-6">
            <code className="text-sm text-white/90">{`import { useAeSdk } from '@/hooks';
import { useToast } from '@/components/ToastProvider';

export default function MyApp() {
  const { activeAccount, sdk } = useAeSdk();
  const toast = useToast();
  
  // Use platform features
}`}</code>
          </pre>

          <h2 className="text-xl font-bold text-white mb-4 mt-8">Community Guidelines</h2>
          <ul className="list-disc list-inside text-white/80 mb-6 space-y-2 ml-4">
            <li><strong className="text-white">Be respectful</strong>: Don't create apps that harm users or violate terms of service</li>
            <li><strong className="text-white">Open source</strong>: Consider open-sourcing your mini-app for the community</li>
            <li><strong className="text-white">Documentation</strong>: Provide clear documentation for your app</li>
            <li><strong className="text-white">Testing</strong>: Test your app thoroughly before registering</li>
            <li><strong className="text-white">Updates</strong>: Keep your app updated and maintain compatibility</li>
          </ul>

          <div className="mt-8 p-6 bg-white/5 border border-white/10 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-3">Questions?</h3>
            <p className="text-white/80 mb-4">Join our developer community:</p>
            <div className="flex flex-wrap gap-4">
              <a
                href="https://github.com/superhero-com/superhero"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                GitHub
              </a>
            </div>
          </div>
        </div>
      </GlassSurface>
    </div>
  );
}


