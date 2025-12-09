import React, { useMemo } from "react";
import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Share, Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type SharePopoverProps = {
  postId: string | number;
  postSlug?: string;
  className?: string;
  compact?: boolean;
  urlOverride?: string; // when provided, share this URL instead of building a post URL
  label?: string; // copy context: 'post' (default) or custom like 'trend'
};

export default function SharePopover({ postId, postSlug, className, compact = false, urlOverride, label = "post" }: SharePopoverProps) {
  const { t } = useTranslation('social');
  const shareLabel = label === 'post' ? t('sharePost') : t('shareComment');
  const url = useMemo(() => {
    if (urlOverride) {
      const isAbsolute = /^https?:\/\//i.test(urlOverride);
      return isAbsolute ? urlOverride : `${window.location.origin}${urlOverride.startsWith('/') ? '' : '/'}${urlOverride}`;
    }
    const path = `/post/${(postSlug || String(postId).replace(/_v3$/, ""))}`;
    return `${window.location.origin}${path}`;
  }, [postId, postSlug, urlOverride]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center gap-1.5 h-auto min-h-0 min-w-0 rounded-lg bg-transparent border-0 md:bg-white/[0.04] md:border md:border-white/10 md:hover:border-white/20 md:ring-1 md:ring-white/15 md:hover:ring-white/25 md:transition-colors",
            compact
              ? "md:h-[22px] md:min-h-[22px] px-2 md:px-1.5"
              : "md:h-[28px] md:min-h-[28px] px-2 md:px-2.5",
            className
          )}
          aria-label={`${t('share')} ${shareLabel}`}
          title={`${t('share')} ${shareLabel}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Share className={cn(compact ? "w-[11px] h-[11px]" : "w-[14px] h-[14px]", "opacity-80")} strokeWidth={2.25} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[260px] max-w-[92vw] p-1 rounded-xl border border-white/15 bg-black/80 backdrop-blur-md shadow-2xl text-white">
        <DropdownMenuItem
          className="flex items-center gap-3 py-2.5 px-3 text-[14px] hover:bg-white/10 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            try { navigator.clipboard.writeText(url); } catch {}
          }}
        >
          <LinkIcon className="w-4 h-4 opacity-85" />
          <span>{t('copyLink')}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem
          className="flex items-center gap-3 py-2.5 px-3 text-[14px] hover:bg-white/10 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            const nav: any = navigator;
            if (nav?.share) {
              nav.share({ url, title: t('superheroPost') }).catch(() => {});
            } else {
              try { navigator.clipboard.writeText(url); } catch {}
            }
          }}
        >
          <Share className="w-4 h-4 opacity-85" strokeWidth={2.25} />
          <span>{t('shareVia', { label: shareLabel })}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


