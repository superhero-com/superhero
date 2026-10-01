import { isValidElement, type ComponentProps, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PostTokenTag from '@/components/social/PostTokenTag';
import { linkify } from '@/utils/linkify';

type PostContentProps = {
  content: string;
  options?: Parameters<typeof linkify>[1];
};

const PostContent = ({ content, options }: PostContentProps) => {
  const { t } = useTranslation('social');
  const cards = new Map<string, ReactNode>();
  // Reuse the existing parser and its escaped React nodes. Only change placement
  // of advanced token cards; punctuation, links and author-selected options survive.
  const body = linkify(content, options).map((node) => {
    if (!isValidElement<ComponentProps<typeof PostTokenTag>>(node)
      || node.type !== PostTokenTag || !node.props.options.chart) return node;
    const { symbol, options: tokenOptions } = node.props;
    const key = `${symbol.toUpperCase()}:${JSON.stringify(tokenOptions)}`;
    if (!cards.has(key)) {
      cards.set(key, <PostTokenTag key={key} symbol={symbol} options={tokenOptions} compact />);
    }
    return (
      <Link
        key={node.key}
        className="post-content__token"
        to={`/trends/tokens/${encodeURIComponent(symbol.toUpperCase())}?showTrade=0`}
        onClick={(event) => event.stopPropagation()}
      >
        {`#${symbol}`}
      </Link>
    );
  });

  return (
    <>
      <div className="post-content__text sh-pill-container" dir="auto">{body}</div>
      {cards.size > 0 && (
        <section className="post-content__assets" aria-label={t('postLayout.mentionedTrends')}>
          {Array.from(cards.values())}
        </section>
      )}
    </>
  );
};

export default PostContent;
