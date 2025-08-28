import React, { memo } from 'react';
import Identicon from '../../../components/Identicon';

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
  size = 48, 
  overlaySize = 24 
}: PostAvatarProps) => (
  <div className="avatar-container">
    <div className="avatar-stack">
      {chainName && (
        <div className="chain-avatar">
          <Identicon address={authorAddress} size={size} name={chainName} />
        </div>
      )}
      {(!chainName || chainName === 'Legend') && (
        <div className="address-avatar">
          <Identicon address={authorAddress} size={size} />
        </div>
      )}
      {chainName && chainName !== 'Legend' && (
        <div className="address-avatar-overlay">
          <Identicon address={authorAddress} size={overlaySize} />
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
