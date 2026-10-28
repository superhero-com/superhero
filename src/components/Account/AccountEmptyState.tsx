import type { LucideIcon } from 'lucide-react';

interface AccountEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}

const AccountEmptyState = ({
  icon: Icon,
  title,
  description,
  className = '',
}: AccountEmptyStateProps) => (
  <div className={`text-center py-12 px-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xl ${className}`}>
    <Icon size={36} className="mx-auto mb-3 opacity-30" aria-hidden="true" />
    <div className="text-white font-semibold mb-1">{title}</div>
    <div className="text-white/60 text-sm">{description}</div>
  </div>
);

export default AccountEmptyState;
