import { memo } from 'react';
import AddressAvatarWithChainName from '../../../@components/Address/AddressAvatarWithChainName';

interface PostAvatarProps {
  authorAddress: string;
  chainName?: string;
  size?: number;
  overlaySize?: number;
}

// Component: Post Avatar with chain name support - now uses AddressAvatarWithChainName
const PostAvatar = memo(({
  authorAddress,
  chainName,
  size = 36,
  overlaySize = 18
}: PostAvatarProps) => (
  <AddressAvatarWithChainName 
    address={authorAddress}
    size={size}
    overlaySize={overlaySize}
    // showAddress={false} // Only show avatar, no text for PostAvatar
  />
), (prevProps, nextProps) => {
  // Custom comparison for better performance
  return prevProps.authorAddress === nextProps.authorAddress &&
    prevProps.chainName === nextProps.chainName &&
    prevProps.size === nextProps.size &&
    prevProps.overlaySize === nextProps.overlaySize;
});

PostAvatar.displayName = 'PostAvatar';

export default PostAvatar;
