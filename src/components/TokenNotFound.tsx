import { Button } from '@/components/ui/button';
import { Head } from '@/seo/Head';
import { useNavigate } from 'react-router-dom';

interface TokenNotFoundProps {
  tokenName: string;
  errorMessage?: string;
}

function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

const TokenNotFound = ({ tokenName, errorMessage }: TokenNotFoundProps) => {
  const navigate = useNavigate();
  const decodedName = safeDecodeURIComponent(tokenName).trim();
  // Truncate to 20 characters for the create token page
  const truncatedName = decodedName.slice(0, 20);

  return (
    <div className="max-w-[min(1536px,100%)] mx-auto min-h-[70vh] text-white px-4 flex items-center justify-center">
      <Head
        title={`Token #${decodedName} Not Found | Superhero.com`}
        description={`The token ${decodedName} doesn't exist on Solana BCL.`}
        canonicalPath={`/trends/tokens/${encodeURIComponent(tokenName)}`}
      />

      <div className="relative w-full max-w-xl">
        {/* Decorative background elements */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div
            className="absolute w-72 h-72 rounded-full blur-3xl opacity-20"
            style={{
              background: 'radial-gradient(circle, var(--neon-pink) 0%, transparent 70%)',
              top: '-20%',
              right: '-10%',
              animation: 'float 6s ease-in-out infinite',
            }}
          />
          <div
            className="absolute w-56 h-56 rounded-full blur-3xl opacity-15"
            style={{
              background: 'radial-gradient(circle, var(--neon-teal) 0%, transparent 70%)',
              bottom: '-15%',
              left: '-5%',
              animation: 'float 8s ease-in-out infinite reverse',
            }}
          />
        </div>

        {/* Main card */}
        <div
          className="relative backdrop-blur-xl rounded-3xl p-8 sm:p-10 text-center"
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          }}
        >
          {/* Token icon placeholder */}
          <div
            className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.15) 0%, rgba(78, 205, 196, 0.15) 100%)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <svg
              className="w-10 h-10 sm:w-12 sm:h-12 text-white/40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          {/* Title with token name */}
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Token
            {' '}
            <span
              className="inline-block"
              style={{
                background: 'linear-gradient(135deg, var(--neon-pink) 0%, var(--neon-teal) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              <span className="text-white/50 text-[0.85em] mr-0.5">#</span>
              {decodedName}
            </span>
          </h1>

          <p className="text-xl sm:text-2xl font-semibold text-white/80 mb-4">
            Not Found
          </p>

          <p className="text-white/50 text-base mb-8 max-w-md mx-auto leading-relaxed">
            This Token doesn&apos;t exist yet on this cluster.
            It may not have been created or the address might be incorrect.
          </p>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              onClick={() => navigate('/trends/tokens')}
              className="w-full sm:w-auto px-6 py-5 text-sm font-bold rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-[0_0_25px_rgba(0,255,157,0.35)]"
              style={{
                background: 'linear-gradient(135deg, var(--neon-teal) 0%, var(--neon-blue) 100%)',
                color: '#0a0a0f',
                border: 'none',
              }}
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
              Browse All Tokens
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate(`/trends/create?tokenName=${encodeURIComponent(truncatedName)}`)}
              className="w-full sm:w-auto px-6 py-5 text-sm font-semibold rounded-xl border-white/15 bg-white/5 text-white hover:bg-white/10 transition-all duration-300 hover:scale-105"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create This Token
            </Button>
          </div>

          {/* Bottom hint */}
          <p className="mt-8 text-xs text-white/30">
            Looking for a different token? Use the search on the tokens page.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TokenNotFound;
