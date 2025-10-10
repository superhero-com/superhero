import React, { useMemo } from "react";
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
  className?: string;
};

export default function SharePopover({ postId, className }: SharePopoverProps) {
  const url = useMemo(() => {
    const path = `/post/${String(postId).replace(/_v3$/, "")}`;
    return `${window.location.origin}${path}`;
  }, [postId]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center gap-1.5 h-auto min-h-0 min-w-0 md:h-[28px] md:min-h-[28px] px-2 rounded-lg bg-transparent border-0 md:px-2.5 md:bg-white/[0.04] md:border md:border-white/10 md:hover:border-white/20 md:ring-1 md:ring-white/15 md:hover:ring-white/25 transition-colors",
            className
          )}
          aria-label="Share post"
          title="Share post"
          onClick={(e) => e.stopPropagation()}
        >
          <Share className="w-[14px] h-[14px] opacity-80" strokeWidth={2.25} />
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
          <span>Copy link</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem
          className="flex items-center gap-3 py-2.5 px-3 text-[14px] hover:bg-white/10 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            const nav: any = navigator;
            if (nav?.share) {
              nav.share({ url, title: "Superhero Post" }).catch(() => {});
            } else {
              try { navigator.clipboard.writeText(url); } catch {}
            }
          }}
        >
          <Share className="w-4 h-4 opacity-85" strokeWidth={2.25} />
          <span>Share post via …</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


