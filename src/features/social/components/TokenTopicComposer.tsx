import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendminerApi } from "../../../api/backend";
import PostForm from "./PostForm";

export default function TokenTopicComposer({ tokenName, isReply = false, postId, onSuccess }: { tokenName: string; isReply?: boolean; postId?: string; onSuccess?: () => void; }) {
  const canonical = useMemo(() => `#${String(tokenName || '').toLowerCase()}`, [tokenName]);
  const uppercaseTag = useMemo(() => `#${String(tokenName || '').toUpperCase()}`, [tokenName]);

  // Fetch topic to know if there are existing posts; if not found (404), treat as empty
  const { data } = useQuery({
    queryKey: ["topic-by-name", canonical],
    queryFn: () => TrendminerApi.getTopicByName(String(tokenName || '')) as Promise<any>,
    retry: 1,
  });
  const noPosts = !(Array.isArray((data as any)?.posts) && (data as any).posts.length > 0);

  const placeholder = useMemo(() => {
    return noPosts ? `Be the first to speak about ${uppercaseTag}.` : undefined;
  }, [noPosts, uppercaseTag]);

  return (
    <PostForm
      isPost={!isReply}
      postId={isReply ? postId : undefined}
      onSuccess={onSuccess}
      requiredHashtag={canonical}
      placeholder={isReply ? "Write a reply..." : placeholder}
      className="mt-2"
    />
  );
}


