import { Button } from '@/components/ui/button';
import { Head } from '@/seo/Head';
import { useNavigate, useLocation } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden">
      <Head
        title="Page Not Found | Superhero.com"
        description="The page you're looking for doesn't exist."
        canonicalPath={location.pathname}
      />

      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute w-[500px] h-[500px] rounded-full opacity-20 blur-3xl"
          style={{
            background: 'radial-gradient(circle, var(--neon-pink) 0%, transparent 70%)',
            top: '-10%',
            left: '-10%',
            animation: 'float 8s ease-in-out infinite',
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full opacity-15 blur-3xl"
          style={{
            background: 'radial-gradient(circle, var(--neon-teal) 0%, transparent 70%)',
            bottom: '-5%',
            right: '-5%',
            animation: 'float 10s ease-in-out infinite reverse',
          }}
        />
        <div
          className="absolute w-[300px] h-[300px] rounded-full opacity-10 blur-3xl"
          style={{
            background: 'radial-gradient(circle, var(--neon-blue) 0%, transparent 70%)',
            top: '40%',
            left: '60%',
            animation: 'float 12s ease-in-out infinite',
          }}
        />
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center max-w-lg mx-auto">
        {/* Glitch-style 404 number */}
        <div className="relative mb-6">
          <h1
            className="text-[120px] sm:text-[180px] font-black leading-none select-none"
            style={{
              background: 'linear-gradient(135deg, var(--neon-pink) 0%, var(--neon-teal) 50%, var(--neon-blue) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: 'none',
              filter: 'drop-shadow(0 0 30px rgba(255, 107, 107, 0.3))',
            }}
          >
            404
          </h1>
          {/* Glitch layers */}
          <span
            className="absolute inset-0 text-[120px] sm:text-[180px] font-black leading-none select-none opacity-50"
            style={{
              background: 'linear-gradient(135deg, var(--neon-teal) 0%, var(--neon-pink) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              transform: 'translate(3px, -3px)',
              animation: 'glitch 3s ease-in-out infinite',
            }}
            aria-hidden="true"
          >
            404
          </span>
        </div>

        {/* Decorative line */}
        <div
          className="w-24 h-1 mx-auto mb-8 rounded-full"
          style={{
            background: 'linear-gradient(90deg, var(--neon-pink), var(--neon-teal), var(--neon-blue))',
          }}
        />

        {/* Message */}
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
          Oops! Lost in the
          {' '}
          <span
            style={{
              background: 'linear-gradient(135deg, var(--neon-teal) 0%, var(--neon-blue) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            blockchain
          </span>
        </h2>

        <p className="text-white/60 text-base sm:text-lg mb-10 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved
          to another dimension.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            size="lg"
            onClick={() => navigate('/')}
            className="w-full sm:w-auto px-8 py-6 text-base font-bold rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(0,255,157,0.4)]"
            style={{
              background: 'linear-gradient(135deg, var(--neon-teal) 0%, var(--neon-blue) 100%)',
              color: '#0a0a0f',
              border: 'none',
            }}
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Go Home
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto px-8 py-6 text-base font-semibold rounded-2xl border-white/20 bg-white/5 text-white hover:bg-white/10 transition-all duration-300 hover:scale-105"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Go Back
          </Button>
        </div>

        {/* Helpful links */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <p className="text-white/40 text-sm mb-4">Or explore these pages:</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <button
              type="button"
              onClick={() => navigate('/trends/tokens')}
              className="text-white/60 hover:text-white transition-colors underline-offset-4 hover:underline"
            >
              Browse Tokens
            </button>
            <span className="text-white/20">•</span>
            <button
              type="button"
              onClick={() => navigate('/trends/create')}
              className="text-white/60 hover:text-white transition-colors underline-offset-4 hover:underline"
            >
              Create Token
            </button>
          </div>
        </div>
      </div>

      {/* Inline keyframes for glitch animation */}
      <style>
        {`
          @keyframes glitch {
            0%, 100% { transform: translate(3px, -3px); opacity: 0.5; }
            20% { transform: translate(-3px, 3px); opacity: 0.3; }
            40% { transform: translate(2px, -2px); opacity: 0.5; }
            60% { transform: translate(-2px, 2px); opacity: 0.4; }
            80% { transform: translate(3px, -1px); opacity: 0.5; }
          }
        `}
      </style>
    </div>
  );
};

export default NotFound;
