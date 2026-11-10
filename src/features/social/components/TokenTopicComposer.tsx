import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import PostForm from './PostForm';
import { useTopicPosts } from '../hooks/useTopicPosts';

const TokenTopicComposer = ({
  tokenName, isReply = false, postId, onSuccess,
}: { tokenName: string; isReply?: boolean; postId?: string; onSuccess?: () => void; }) => {
  const { t } = useTranslation('forms');
  const canonical = useMemo(() => `#${String(tokenName || '').toLowerCase()}`, [tokenName]);
  const uppercaseTag = useMemo(() => `#${String(tokenName || '').toUpperCase()}`, [tokenName]);

  // Same query as TokenTopicFeed, so on the token page this costs no request.
  const { items } = useTopicPosts(String(tokenName || ''));
  const noPosts = items.length === 0;

  const placeholder = useMemo(() => (noPosts ? t('beFirstToSpeak', { hashtag: uppercaseTag }) : undefined), [noPosts, uppercaseTag, t]);

  return (
    <PostForm
      isPost={!isReply}
      postId={isReply ? postId : undefined}
      onSuccess={onSuccess}
      requiredHashtag={canonical}
      placeholder={isReply ? t('writeReply') : placeholder}
      className="mt-2"
    />
  );
};

export default TokenTopicComposer;
