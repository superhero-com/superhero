import { cn } from '../../../../lib/utils';

export type MilestoneStatus = 'locked' | 'in_progress' | 'completed';

interface MilestoneCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  rewardAe: number;
  status: MilestoneStatus;
  current?: number;
  total?: number;
  statusLabel?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  expanded?: boolean;
}

const statusBadge: Record<MilestoneStatus, { label: string; className: string }> = {
  locked: {
    label: 'LOCKED',
    className: 'bg-white/10 text-white/50',
  },
  in_progress: {
    label: 'IN PROGRESS',
    className: 'bg-white/10 text-white/70',
  },
  completed: {
    label: 'COMPLETED',
    className: 'bg-emerald-500/20 text-emerald-400',
  },
};

const MilestoneCard = ({
  icon,
  title,
  description,
  rewardAe,
  status,
  current,
  total,
  statusLabel,
  actionLabel,
  onAction,
  className,
  expanded = false,
}: MilestoneCardProps) => {
  const badge = statusBadge[status];
  const progressPct = total && total > 0 ? Math.min((current ?? 0) / total * 100, 100) : 0;

  return (
    <div
      className={cn(
        'bg-[#0d1117]/80 backdrop-blur-lg border border-white/10 rounded-2xl relative overflow-hidden transition-all duration-300',
        expanded ? 'p-6 md:p-8' : 'p-5 md:p-6',
        status === 'completed' && 'border-emerald-500/20',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 text-lg">
          {icon}
        </div>
        <div className="flex items-center gap-2">
          {status !== 'locked' && (
            <span className={cn('text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full', badge.className)}>
              {statusLabel ?? badge.label}
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-xs font-bold bg-[#1a1f2e] border border-white/10 rounded-full px-2.5 py-1 text-white/90">
            🎁 {rewardAe} AE
          </span>
        </div>
      </div>

      <h3 className="text-lg md:text-xl font-bold text-white m-0 mb-2">
        {title}
      </h3>
      <p className="text-sm text-white/50 m-0 mb-5 leading-relaxed">
        {description}
      </p>

      {total != null && total > 0 && (
        <div className="space-y-2">
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
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
          <div className="flex justify-between items-baseline text-xs">
            {status === 'completed' ? (
              <span className="text-emerald-400 font-medium">Complete</span>
            ) : (
              <>
                <span className="text-white/40 font-mono tracking-wider uppercase">
                  {statusLabel ?? `verification logic: ${Math.round(progressPct)}%`}
                </span>
                <span className="text-white/40 font-mono tracking-wider uppercase">
                  {current}/{total}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {current != null && total != null && !expanded && (
        <div className="flex items-baseline gap-1 mt-4">
          <span className="text-2xl font-bold text-white">{current}</span>
          <span className="text-sm text-white/30">/{total}</span>
          <span className="ml-auto text-xs text-white/40">{Math.round(progressPct)}% Complete</span>
        </div>
      )}

      {actionLabel && onAction && status !== 'completed' && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cyan-500/25"
        >
          {actionLabel}
          <span className="text-base">→</span>
        </button>
      )}

      {status === 'completed' && (
        <div className="mt-4 inline-flex items-center gap-2 text-sm text-emerald-400 font-medium">
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Milestone complete
        </div>
      )}
    </div>
  );
};

export default MilestoneCard;
