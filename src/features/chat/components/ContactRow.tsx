/**
 * Shared identicon + title + subtitle row — the web analogue of the app's
 * `contact-row.tsx`. Used by the inbox DM list and the start-a-chat dialog.
 */
import Identicon from '@/components/Identicon';
import { cn } from '@/lib/utils';

export interface ContactRowProps {
  /** Identicon seed (npub / pubkey / æ address). */
  seed: string;
  title: string;
  subtitle?: string | null;
  trailing?: React.ReactNode;
  unreadCount?: number;
  onClick?: () => void;
  as?: 'button' | 'div';
  className?: string;
}

export const ContactRow = ({
  seed, title, subtitle, trailing, unreadCount, onClick, as = 'button', className,
}: ContactRowProps) => {
  const Wrapper = as;
  return (
    <Wrapper
      type={as === 'button' ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition hover:border-primary/40',
        className,
      )}
    >
      <Identicon address={seed} size={40} />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-foreground">{title}</div>
        {subtitle && (
          <div className="truncate text-xs text-muted-foreground">{subtitle}</div>
        )}
      </div>
      {typeof unreadCount === 'number' && unreadCount > 0 && (
        <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
          {unreadCount}
        </span>
      )}
      {trailing}
    </Wrapper>
  );
};
