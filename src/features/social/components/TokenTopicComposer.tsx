import React, { useMemo } from "react";
import PostForm from "./PostForm";

export default function TokenTopicComposer({ tokenName, isReply = false, postId, onSuccess }: { tokenName: string; isReply?: boolean; postId?: string; onSuccess?: () => void; }) {
  const canonical = useMemo(() => `#${String(tokenName || '').toLowerCase()}`, [tokenName]);
  const initialText = useMemo(() => `${canonical} `, [canonical]);

  return (
    <PostForm
      isPost={!isReply}
      postId={isReply ? postId : undefined}
      onSuccess={onSuccess}
      initialText={initialText}
      requiredHashtag={canonical}
      placeholder={isReply ? "Write a reply..." : undefined}
      className="mt-2"
    />
  );
}


