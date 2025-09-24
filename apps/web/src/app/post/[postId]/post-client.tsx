"use client";
import { useRouter } from "next/navigation";
import type { PostDto } from "@super/api/generated";
import PostContent from "@super/features/social/components/PostContent";

export default function PostClient({ postData }: { postData: PostDto }) {
  const router = useRouter();
  const post: Record<string, unknown> = {
    id: postData.id,
    title: postData.content,
    text: postData.content,
    author: postData.sender_address,
    address: postData.sender_address,
    timestamp: postData.created_at,
    media: postData.media,
    url: null,
    linkPreview: null,
  };

  return (
    <div className="w-full py-2 px-2 sm:px-3 md:px-4">
      <div className="mb-4">
        <button onClick={() => router.push("/")} className="text-sm underline">
          ← Back
        </button>
      </div>
      <article className="grid">
        <header className="mb-3">
          <h1 className="text-base font-semibold">Post</h1>
        </header>
        <div className="relative -mt-5 md:mt-0">
          <div className="border-l border-white/20 ml-[20px] pl-[32px] md:border-none md:ml-0 md:pl-[52px] relative z-10">
            <PostContent post={post} />
          </div>
        </div>
      </article>
    </div>
  );
}


