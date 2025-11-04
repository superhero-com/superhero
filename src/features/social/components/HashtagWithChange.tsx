import { Link } from 'react-router-dom';
import { PostDto } from '../../../api/generated';

export default function HashtagWithChange({ tag, post }: { tag: string, post?: PostDto }) {
  const clean = String(tag || '').replace(/^#/, '');
  const upper = clean.toUpperCase();

  const topic = post?.topics?.find((t) => t.name === clean?.toLowerCase());
  const changePercent = topic?.token?.performance?.past_30d?.current_change_percent;
  const isUp = changePercent && changePercent > 0;
  const isDown = changePercent && changePercent < 0;


  const linkTo = `/trends/tokens/${upper}`;

  return (
    <span className="inline-flex items-center gap-0.5 align-middle">
      <Link
        to={linkTo}
        className="break-words relative inline-block"
        style={{ color: '#00ff9d' }}
        onClick={(e) => e.stopPropagation()}
      >
        #{clean}
      </Link>
      {topic?.token?.performance?.past_30d?.current_change_percent && (
        <span
          className={`inline-flex items-center px-1 py-0.5 rounded-full text-[10px] font-mono font-semibold leading-none tracking-tighter ${isUp
              ? 'bg-green-400/10 text-green-400 border border-green-400/20'
              : isDown
                ? 'bg-red-400/10 text-red-400 border border-red-400/20'
                : 'bg-white/10 text-white/60 border border-white/20'
            }`}
          title="24h change"
          aria-label={`24h change: ${topic?.token?.performance?.past_30d?.current_change_percent?.toFixed(2)}%`}
        >
          {topic?.token?.performance?.past_30d?.current_change_percent?.toFixed(2)}%
        </span>
      )}
    </span>
  );
}


