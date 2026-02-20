import { useNavigate } from 'react-router-dom';

export interface TrendingTag {
  fullName?: string;
  tag: string;
  score: number;
  source?: string;
}

function formatCompact(value: number | string): string {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  return n.toFixed(1).replace(/\.0$/, '');
}

interface TrendingTagTableRowProps {
  tag: TrendingTag;
  rank: number;
}

const TrendingTagTableRow = ({ tag, rank }: TrendingTagTableRowProps) => {
  const navigate = useNavigate();

  const handleTokenize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/trends/create?platform=${tag.source ?? ''}&tokenName=${tag.tag}`);
  };

  const scoreLabel = formatCompact(tag.score);

  return (
    <>
      {/* Mobile compact layout */}
      <tr className="mobile-only-card md:hidden relative trending-tag-row">
        <td className="cell-fake" />
        <td className="pl-3 pr-3 py-1 align-middle text-white/40 text-[11px] font-semibold text-center">
          {rank}
        </td>
        <td className="pl-2 py-1 pr-3 align-middle relative" colSpan={3}>
          <div className="text-[14px] font-bold text-white leading-5 whitespace-nowrap overflow-hidden text-ellipsis">
            <span className="text-white/40 text-[.85em] mr-0.5 align-baseline">#</span>
            <span>{tag.tag}</span>
          </div>
          <div className="flex items-center justify-between gap-3 pt-0">
            <div className="flex items-center gap-1.5 text-[11px] text-white/50 font-medium leading-4">
              <svg className="w-3 h-3 text-[#1161FE] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
              </svg>
              <span className="text-white/70">{scoreLabel}</span>
              {tag.source && (
                <a
                  href={`https://x.com/search?q=${encodeURIComponent(`#${tag.tag}`)}&src=typed_query`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-white/40 hover:text-white/70 transition-colors"
                >
                  via {tag.source}
                </a>
              )}
            </div>
            <button
              type="button"
              className="flex-shrink-0 px-2.5 py-1 rounded-lg text-white cursor-pointer text-xs font-semibold transition-all duration-300 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
              onClick={handleTokenize}
            >
              Tokenize
            </button>
          </div>
          <a
            href={`/trends/create?platform=${tag.source ?? ''}&tokenName=${tag.tag}`}
            className="absolute inset-0 z-10"
            aria-label={`Tokenize trending tag #${tag.tag}`}
            onClick={handleTokenize}
          />
        </td>
      </tr>

      {/* Desktop row */}
      <tr className="bctsl-token-list-table-row trending-tag-row rounded-xl relative overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hidden md:table-row">
        <td className="cell-fake" />

        {/* Rank */}
        <td className="cell cell-rank pl-2 pl-md-4">
          <div className="rank text-md font-bold opacity-30 text-white">
            {rank}
          </div>
        </td>

        {/* Name */}
        <td className="cell cell-name px-1 px-lg-3">
          <div className="token-name text-md font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent transition-colors">
            <span className="text-white/40 text-[.85em] mr-0.5 align-baseline">#</span>
            <span>{tag.tag}</span>
          </div>
        </td>

        {/* Price → Trending Score */}
        <td className="cell cell-price px-1 px-lg-3 text-left text-md-right">
          <div className="flex items-center gap-1 text-sm">
            <svg className="w-3.5 h-3.5 text-[#1161FE] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
            </svg>
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent font-medium">
              {scoreLabel}
            </span>
          </div>
        </td>

        {/* Market Cap → Source */}
        <td className="cell cell-market-cap px-1 px-lg-3 text-md-right hidden md:table-cell">
          {tag.source ? (
            <a
              href={`https://x.com/search?q=${encodeURIComponent(`#${tag.tag}`)}&src=typed_query`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-white/40 hover:text-white/70 transition-colors relative z-20"
            >
              via {tag.source}
            </a>
          ) : (
            <span className="text-white/30">—</span>
          )}
        </td>

        {/* Holders → dash */}
        <td className="cell cell-holders text-left px-1 px-lg-3 hidden md:table-cell">
          <span className="text-white/30">—</span>
        </td>

        {/* Chart → Tokenize button */}
        <td className="cell cell-chart text-center pr-md-4">
          <div className="ml-auto flex justify-center items-center chart max-w-[180px]">
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg text-white cursor-pointer text-xs font-semibold transition-all duration-300 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 relative z-20 whitespace-nowrap"
              onClick={handleTokenize}
            >
              Tokenize
            </button>
          </div>
        </td>

        {/* Full-row link */}
        <td className="cell cell-link">
          <a
            href={`/trends/create?platform=${tag.source ?? ''}&tokenName=${tag.tag}`}
            className="link absolute inset-0 z-10"
            aria-label={`Tokenize trending tag #${tag.tag}`}
            onClick={handleTokenize}
          />
        </td>

        <style>
          {`
          .trending-tag-row {
            position: relative;
            opacity: 0.85;
          }

          .trending-tag-row:hover {
            opacity: 1;
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(168, 85, 247, 0.15);
          }

          .trending-tag-row:hover .token-name {
            background: linear-gradient(to right, #c084fc, #f472b6);
            -webkit-background-clip: text;
            background-clip: text;
          }
        `}
        </style>
      </tr>
    </>
  );
};

export default TrendingTagTableRow;
