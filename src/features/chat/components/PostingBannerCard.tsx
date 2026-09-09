import Spinner from '@/components/Spinner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PostingBanner } from '../hooks/useEnablePosting';

interface PostingBannerCardProps {
  banner: PostingBanner;
  onLink?: () => void;
  onBuy?: (tokenAddress?: string) => void;
  onCheckAgain?: () => void;
}

/**
 * Renders a {@link PostingBanner} descriptor verbatim (the derivation lives in
 * `useEnablePosting`, not here). Shown in place of the composer when the user
 * can't post.
 */
export const PostingBannerCard = ({
  banner,
  onLink,
  onBuy,
  onCheckAgain,
}: PostingBannerCardProps) => {
  const {
    icon: Icon, tone, text, action, gate, tokenAddress,
  } = banner;
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border p-4',
        tone === 'gate'
          ? 'border-primary/40 bg-primary/5'
          : 'border-border bg-card',
      )}
    >
      <div className="flex items-start gap-3">
        {tone === 'info' ? (
          <Spinner className="mt-0.5 h-5 w-5 shrink-0" />
        ) : (
          <Icon
            className={cn(
              'mt-0.5 h-5 w-5 shrink-0',
              tone === 'gate' ? 'text-primary' : 'text-muted-foreground',
            )}
            aria-hidden
          />
        )}
        <p className="text-sm text-foreground">{text}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {action === 'link' && (
          <Button size="sm" onClick={onLink}>
            Link your Nostr key
          </Button>
        )}
        {action === 'buy' && (
          <Button size="sm" onClick={() => onBuy?.(tokenAddress)}>
            Buy token
          </Button>
        )}
        {gate === 'provisioning' && onCheckAgain && (
          <Button size="sm" variant="outline" onClick={onCheckAgain}>
            Check again
          </Button>
        )}
      </div>
    </div>
  );
};
