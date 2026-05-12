import { useState, useEffect } from 'react';
import { IconClose } from '@/icons';

interface RepoData {
  fullName: string;
  description: string | null;
  stars: number;
  forks: number;
  language: string | null;
  owner: string;
  ownerAvatar: string;
}

interface GitHubCardProps {
  owner: string;
  repo: string;
  url: string;
  onDismiss?: () => void;
}

const LANG_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Rust: '#dea584',
  Go: '#00ADD8',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  Ruby: '#701516',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Vue: '#41b883',
  Solidity: '#AA6746',
};

export const GitHubCard = ({
  owner, repo, url, onDismiss,
}: GitHubCardProps) => {
  const [data, setData] = useState<RepoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    setData(null);
    let cancelled = false;

    fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { Accept: 'application/vnd.github+json' },
    })
      .then((r) => {
        if (!r.ok) throw new Error('failed');
        return r.json() as Promise<{
          full_name: string;
          description: string | null;
          stargazers_count: number;
          forks_count: number;
          language: string | null;
          owner: { login: string; avatar_url: string };
        }>;
      })
      .then((d) => {
        if (cancelled) return;
        setData({
          fullName: d.full_name,
          description: d.description,
          stars: d.stargazers_count,
          forks: d.forks_count,
          language: d.language,
          owner: d.owner.login,
          ownerAvatar: d.owner.avatar_url,
        });
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [owner, repo]);

  if (loading) {
    return (
      <div className="relative rounded-xl border border-white/10 bg-white/5 overflow-hidden animate-pulse">
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="absolute top-2 right-2 z-10 bg-black/60 rounded-full w-6 h-6 flex items-center justify-center hover:bg-black/80 transition-colors"
            aria-label="Dismiss"
          >
            <IconClose className="w-3 h-3 text-white" />
          </button>
        )}
        <div className="flex gap-3 p-4">
          <div className="w-10 h-10 rounded-full bg-white/10 flex-shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3 bg-white/10 rounded w-1/3" />
            <div className="h-3 bg-white/10 rounded w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) return null;

  const langColor = data.language ? (LANG_COLORS[data.language] ?? '#8b949e') : null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="relative rounded-xl border border-white/10 bg-white/5 overflow-hidden flex flex-col gap-3 p-4 hover:bg-white/8 hover:border-white/20 transition-all duration-200 no-underline pr-10"
      onClick={(e) => e.stopPropagation()}
    >
      {onDismiss && (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDismiss(); }}
          className="absolute top-2 right-2 z-10 bg-black/60 rounded-full w-6 h-6 flex items-center justify-center hover:bg-black/80 transition-colors"
          aria-label="Dismiss"
        >
          <IconClose className="w-3 h-3 text-white" />
        </button>
      )}

      <div className="flex items-center gap-2 min-w-0">
        <img
          src={data.ownerAvatar}
          alt={data.owner}
          className="w-5 h-5 rounded-full flex-shrink-0"
        />
        {/* GitHub mark */}
        <svg className="w-4 h-4 text-white/60 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
        </svg>
        <span className="text-sm font-semibold text-white truncate">{data.fullName}</span>
      </div>

      {data.description && (
        <p className="text-xs text-white/60 leading-snug line-clamp-2 -mt-1">
          {data.description}
        </p>
      )}

      <div className="flex items-center gap-4 text-xs text-white/50">
        {langColor && (
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: langColor }} />
            {data.language}
          </span>
        )}
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
          </svg>
          {data.stars.toLocaleString()}
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z" />
          </svg>
          {data.forks.toLocaleString()}
        </span>
      </div>
    </a>
  );
};
