"use client";
import { useRouter } from "next/navigation";
// Swap icon imports used by PostForm internals to URL-based React wrappers
import * as IconsCompat from "../icons-compat";
// Shim: make the original barrel point to our compat layer at runtime
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
globalThis.__NEXT_SH_ICONS__ = IconsCompat;
import CreatePost from "@super/features/social/components/CreatePost";
import SortControls from "@super/features/social/components/SortControls";

export default function ClientHomeTop({ sortBy }: { sortBy: string }) {
  const router = useRouter();
  return (
    <div className="hidden md:block">
      <CreatePost onSuccess={async () => {}} />
      <SortControls sortBy={sortBy} onSortChange={(s: string) => router.push(`/?sortBy=${s}`)} />
    </div>
  );
}


