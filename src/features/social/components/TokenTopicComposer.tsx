import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useActiveChain } from "@/hooks/useActiveChain";
import { useChainAdapter } from "@/chains/useChainAdapter";
import PostForm from "./PostForm";

export default function TokenTopicComposer({ tokenName, isReply = false, postId, onSuccess }: { tokenName: string; isReply?: boolean; postId?: string; onSuccess?: () => void; }) {
  const { t } = useTranslation('forms');
  const { selectedChain } = useActiveChain();
  const chainAdapter = useChainAdapter();
  const canonical = useMemo(() => `#${String(tokenName || '').toLowerCase()}`, [tokenName]);
  const uppercaseTag = useMemo(() => `#${String(tokenName || '').toUpperCase()}`, [tokenName]);

  // Fetch topic to know if there are existing posts; if not found (404), treat as empty
  const { data } = useQuery({
    queryKey: ["topic-by-name", selectedChain, canonical],
    queryFn: () => chainAdapter.getTopicByName(String(tokenName || '')) as Promise<any>,
    retry: 1,
  });
  const noPosts = !(Array.isArray((data as any)?.posts) && (data as any).posts.length > 0);

  const placeholder = useMemo(() => {
    return noPosts ? t('beFirstToSpeak', { hashtag: uppercaseTag }) : undefined;
  }, [noPosts, uppercaseTag, t]);

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


