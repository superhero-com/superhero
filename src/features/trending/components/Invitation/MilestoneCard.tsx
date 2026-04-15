import { cn } from '../../../../lib/utils';

export type MilestoneStatus = 'locked' | 'in_progress' | 'completed';

export interface MilestoneStep {
  text: string;
  done?: boolean;
  skipped?: boolean;
}

interface MilestoneCardProps {
  title: string;
  description: string;
  rewardAe: number;
  status: MilestoneStatus;
  current?: number;
  total?: number;
  steps?: MilestoneStep[];
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  children?: React.ReactNode;
}

const MilestoneCard = ({
  title,
  description,
  rewardAe,
  status,
  current,
  total,
  steps,
  actionLabel,
  onAction,
  className,
  children,
}: MilestoneCardProps) => {
  const progressPct = total && total > 0 ? Math.min((current ?? 0) / total * 100, 100) : 0;

  return (
    <div
      className={cn(
        'bg-[#0d1117]/10 backdrop-blur-xl border rounded-2xl relative overflow-hidden transition-all duration-300 p-6 md:p-8',
        status === 'completed'
          ? 'border-emerald-500/30'
          : status === 'in_progress'
            ? 'border-cyan-500/20'
            : 'border-white/10 opacity-60',
        className,
      )}
    >
      {/* Reward badge — top right */}
      <div className="absolute top-4 right-4 md:top-6 md:right-6">
        <div
          className={cn(
            'px-4 py-2 rounded-full font-bold text-sm tracking-wide flex items-center gap-2',
            status === 'completed'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/25',
          )}
        >
          <span className="text-base">{status === 'completed' ? '✅' : '🎁'}</span>
          {rewardAe} AE
        </div>
      </div>

      {/* Status indicator */}
      <div className="mb-4">
        <span
          className={cn(
            'inline-block text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full',
            status === 'completed' && 'bg-emerald-500/20 text-emerald-400',
            status === 'in_progress' && 'bg-cyan-500/15 text-cyan-400',
            status === 'locked' && 'bg-white/10 text-white/40',
          )}
        >
          {status === 'completed' ? 'COMPLETED' : status === 'in_progress' ? 'IN PROGRESS' : 'LOCKED'}
        </span>
      </div>

      {/* Title & description */}
      <h3 className="text-xl md:text-2xl font-bold text-white m-0 mb-2 pr-28">{title}</h3>
      <p className="text-sm text-white/70 m-0 mb-5 leading-relaxed max-w-xl">{description}</p>

      {/* Steps list (only rendered if steps are provided) */}
      {steps && steps.length > 0 && (
        <div className="grid gap-2 mb-6">
          {steps.map((step, i) => (
            <div
              key={step.text}
              className={cn(
                'flex items-start gap-3 p-3 rounded-xl transition-all duration-200',
                step.done
                  ? 'bg-emerald-500/10'
                  : step.skipped
                    ? 'bg-white/[0.02] opacity-40 line-through'
                    : 'bg-white/[0.04] hover:bg-white/[0.06]',
              )}
            >
              <div
                className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center font-semibold flex-shrink-0 text-xs',
                  step.done
                    ? 'bg-emerald-500/30 text-emerald-400'
                    : step.skipped
                      ? 'bg-white/5 text-white/30'
                      : 'bg-white/5 border border-white/10 text-white/50',
                )}
              >
                {step.done ? '✓' : i + 1}
              </div>
              <div
                className={cn(
                  'leading-relaxed text-sm flex-1 min-w-0 pt-0.5',
                  step.done ? 'text-emerald-300/80' : 'text-white/80',
                )}
              >
                {step.text}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Custom children (for milestone-specific content) */}
      {children}

      {/* Progress bar */}
      {total != null && total > 0 && (
        <div className="mb-4">
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700 ease-out',
                status === 'completed'
                  ? 'bg-emerald-400'
                  : 'bg-gradient-to-r from-cyan-400 to-blue-500',
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Progress count + action */}
      {current != null && total != null && (
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-white">{current}</span>
          <span className="text-sm text-white/30">/ {total}</span>
          {actionLabel && onAction && status !== 'completed' && (
            <button
              type="button"
              onClick={onAction}
              className={cn(
                'ml-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5',
                status === 'locked'
                  ? 'bg-white/10 cursor-not-allowed opacity-50'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 hover:shadow-lg hover:shadow-cyan-500/25',
              )}
              disabled={status === 'locked'}
            >
              {actionLabel}
              <span className="text-base">→</span>
            </button>
          )}
        </div>
      )}

      {/* Completed state */}
      {status === 'completed' && (
        <div className="mt-4 inline-flex items-center gap-2 text-sm text-emerald-400 font-medium">
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Milestone complete — {rewardAe} AE earned
        </div>
      )}
    </div>
  );
};

export default MilestoneCard;
