"use client";
import { useRouter } from "next/navigation";
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


