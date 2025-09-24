"use client";
import { useRouter } from "next/navigation";
import type { PostDto } from "@super/api/generated";
import FeedItem from "@super/features/social/components/FeedItem";

export default function Feed({ initialItems }: { initialItems: PostDto[] }) {
  const router = useRouter();
  return (
    <div className="w-full gap-4 flex flex-col">
      {initialItems.map((item: PostDto) => (
        <div key={item.id} className="mb-2">
          {/* onItemClick navigates to Next route */}
          {/* FeedItem expects legacy props; cast to unknown to satisfy types */}
          <FeedItem item={item as unknown as never} commentCount={(item as unknown as { total_comments?: number }).total_comments ?? 0} onItemClick={(id: string) => router.push(`/post/${id}`)} />
        </div>
      ))}
    </div>
  );
}


