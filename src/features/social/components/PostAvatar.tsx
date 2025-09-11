import { memo } from 'react';
import Identicon from '../../../components/Identicon';
import AddressAvatar from '../../../components/AddressAvatar';
import { cn } from '@/lib/utils';

interface PostAvatarProps {
  authorAddress: string;
  chainName?: string;
  size?: number;
  overlaySize?: number;
}

// Component: Post Avatar with chain name support
const PostAvatar = memo(({
  authorAddress,
  chainName,
  size = 36,
  overlaySize = 18
}: PostAvatarProps) => (
  <div className="relative flex-shrink-0">
    <div className="relative">
      {chainName ? (
        <div className="relative">
          <div className="rounded-xl overflow-hidden shadow-md">
            <Identicon address={authorAddress} size={size} name={chainName} />
          </div>
          <div 
            className="absolute -bottom-1 -right-1 rounded border-2 border-background shadow-sm overflow-hidden"
            style={{ width: `${overlaySize}px`, height: `${overlaySize}px` }}
          >
            <AddressAvatar address={authorAddress} size="100%" borderRadius="2px" />
          </div>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden shadow-md">
          <AddressAvatar address={authorAddress} size={size} borderRadius="10px" />
        </div>
      )}
    </div>
  </div>
), (prevProps, nextProps) => {
  // Custom comparison for better performance
  return prevProps.authorAddress === nextProps.authorAddress &&
    prevProps.chainName === nextProps.chainName;
});

PostAvatar.displayName = 'PostAvatar';

export default PostAvatar;
