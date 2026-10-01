import { Link } from 'react-router-dom';
import { AddressAvatarWithChainName } from '@/@components/Address/AddressAvatarWithChainName';
import type { PostDto } from '@/api/generated';
import { compactTime, fullTimestamp } from '@/utils/time';
import { BlockchainInfoPopover } from './BlockchainInfoPopover';
import InlineCopyButton from './InlineCopyButton';

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
          <time dateTime={item.created_at} title={fullTimestamp(item.created_at)}>
            {compactTime(item.created_at)}
          </time>
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
