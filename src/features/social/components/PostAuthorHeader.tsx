import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AddressAvatarWithChainName } from '@/@components/Address/AddressAvatarWithChainName';
import type { PostDto } from '@/api/generated';
import { compactTime, fullTimestamp } from '@/utils/time';
import { BlockchainInfoPopover } from './BlockchainInfoPopover';
import InlineCopyButton from './InlineCopyButton';

// Short time in the byline, exact date and time on hover/long-press.
const PostTime = ({ createdAt }: { createdAt: string }) => {
  const { i18n } = useTranslation();
  return (
    <time dateTime={createdAt} title={fullTimestamp(createdAt)}>
      {compactTime(createdAt, i18n.resolvedLanguage)}
    </time>
  );
};

const PostAuthorHeader = ({ item, displayName, compact }: {
  item: PostDto; displayName: string; compact: boolean;
}) => (
  <header className="feed-post__header">
    <AddressAvatarWithChainName
      address={item.sender_address}
      size={38}
      showAddressAndChainName={false}
      variant="feed"
    />
    <div className="feed-post__identity">
      <div className="feed-post__byline">
        <Link
          to={`/users/${item.sender_address}`}
          className={displayName ? 'feed-post__name' : 'feed-post__name feed-post__name--address'}
          onClick={(event) => event.stopPropagation()}
        >
          <bdi>{displayName || item.sender_address}</bdi>
        </Link>
        <span className="feed-post__time">
          <span aria-hidden="true">·</span>
          <PostTime createdAt={item.created_at} />
        </span>
      </div>
      <div className="feed-post__address">
        <span dir="ltr">{item.sender_address}</span>
        <InlineCopyButton value={item.sender_address} />
      </div>
    </div>
    {item.tx_hash && (
      <BlockchainInfoPopover
        txHash={item.tx_hash}
        createdAt={item.created_at}
        sender={item.sender_address}
        contract={item.contract_address}
        postId={String(item.id)}
        className="feed-post__chain"
        showLabel={!compact}
      />
    )}
  </header>
);

export default PostAuthorHeader;
