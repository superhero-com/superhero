// import React from 'react';

// interface AddressAvatarProps {
//   address: string;
//   size?: number | string;
//   className?: string;
//   style?: React.CSSProperties;
//   borderRadius?: string;
// }

// export default function AddressAvatar({ 
//   address, 
//   size = 24, 
//   className = '',
//   borderRadius = '50%',
//   style = {}
// }: AddressAvatarProps) {
//   // Using a simple avatar service - you can replace this with your preferred service
//   const avatarUrl = `https://avatars.superherowallet.com/${address}`;
  
//   const radiusClass = 'rounded-full';
  
//   return (
//     <div 
//       className={`${radiusClass} overflow-hidden flex items-center justify-center bg-white/5 border border-white/15 backdrop-blur-sm flex-shrink-0 ${className}`}
//       style={{
//         width: typeof size === 'string' ? size : `${size}px`,
//         height: typeof size === 'string' ? size : `${size}px`,
//         borderRadius: '50%',
//         ...style
//       }}
//     >
//       <img
//         src={avatarUrl}
//         alt={`Avatar for ${address}`}
//         className="w-full h-full object-cover"
//         onError={(e) => {
//           // Fallback to a simple colored circle with initials
//           const target = e.target as HTMLImageElement;
//           target.style.display = 'none';
//           const parent = target.parentElement;
//           if (parent) {
//             // Calculate font size based on actual rendered size for percentage values
//             let fontSize = '12px';
//             if (typeof size === 'number') {
//               fontSize = `${size * 0.4}px`;
//             } else if (typeof size === 'string' && size.includes('%')) {
//               // For percentage sizes, use a relative font size
//               fontSize = '0.4em';
//             } else if (typeof size === 'string' && size.includes('px')) {
//               const pxValue = parseInt(size.replace('px', ''));
//               fontSize = `${pxValue * 0.4}px`;
//             }
            
//             parent.style.background = `hsl(${address.charCodeAt(0) * 137.508}deg, 70%, 50%)`;
//             parent.innerHTML = `<span class="text-white font-semibold" style="font-size: ${fontSize};">${address.slice(0, 2).toUpperCase()}</span>`;
//           }
//         }}
//       />
//     </div>
//   );
// }


import React, { useMemo } from 'react';
import { createAvatar } from '@dicebear/core';
import { avataaars } from '@dicebear/collection';
import * as jdenticon from 'jdenticon';

interface AddressAvatarProps {
  address: string;
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
  borderRadius?: string;
}

export default function AddressAvatar({ 
  address, 
  size = 24, 
  className = '',
  borderRadius = '50%',
  style = {}
}: AddressAvatarProps) {
  // Generate avatar SVG using dicebear or jdenticon based on address
  const avatarSvg = useMemo(() => {
    // Handle undefined/null address
    if (!address) {
      return null;
    }
    
    try {
      const avatarSize = typeof size === 'number' ? size : 128;
      
      // Use dicebear avataaars for .chain addresses, jdenticon for others
      if (address.includes('.chain')) {
        const avatar = createAvatar(avataaars, {
          seed: address,
          size: avatarSize,
          backgroundColor: ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf'],
          backgroundType: ['solid'],
          skinColor: ['tanned', 'yellow', 'pale', 'light', 'brown', 'darkBrown', 'black'],
          hairColor: ['auburn', 'black', 'blonde', 'blondeGolden', 'brown', 'brownDark', 'pastelPink', 'platinum', 'red', 'silverGray'],
          facialHairColor: ['auburn', 'black', 'blonde', 'blondeGolden', 'brown', 'brownDark', 'pastelPink', 'platinum', 'red', 'silverGray'],
          clothesColor: ['262e33', '65c9ff', '5199e4', '25557c', '000000', '3c4f5c', 'e6e6fa', 'ff0000', 'ff8c00', 'ffd700', '00ff00', '00ffff', '0000ff', 'ff00ff'],
          accessoriesColor: ['e6e6fa', 'ff0000', 'ff8c00', 'ffd700', '00ff00', '00ffff', '0000ff', 'ff00ff'],
        });
        
        return avatar.toString();
      } else {
        // Use jdenticon for non-.chain addresses
        return jdenticon.toSvg(address, avatarSize);
      }
    } catch (error) {
      console.warn('Failed to generate avatar:', error);
      return null;
    }
  }, [address, size]);

  // Fallback to initials if avatar generation fails
  const fallbackContent = useMemo(() => {
    // Handle undefined/null address
    if (!address) {
      return {
        initials: '??',
        backgroundColor: 'hsl(0deg, 0%, 50%)',
        fontSize: '12px'
      };
    }
    
    const initials = address.slice(0, 2).toUpperCase();
    const backgroundColor = `hsl(${address.charCodeAt(0) * 137.508}deg, 70%, 50%)`;
    
    // Calculate font size based on actual rendered size
    let fontSize = '12px';
    if (typeof size === 'number') {
      fontSize = `${size * 0.4}px`;
    } else if (typeof size === 'string' && size.includes('%')) {
      fontSize = '0.4em';
    } else if (typeof size === 'string' && size.includes('px')) {
      const pxValue = parseInt(size.replace('px', ''));
      fontSize = `${pxValue * 0.4}px`;
    }
    
    return { initials, backgroundColor, fontSize };
  }, [address, size]);

  const radiusClass = 'rounded-full';
  
  return (
    <div 
      className={`${radiusClass} overflow-hidden flex items-center justify-center bg-white/5 border border-white/15 backdrop-blur-sm flex-shrink-0 ${className}`}
      style={{
        width: typeof size === 'string' ? size : `${size}px`,
        height: typeof size === 'string' ? size : `${size}px`,
        borderRadius: '50%',
        ...style
      }}
    >
      {avatarSvg ? (
        <span 
          className="custom-address w-full h-full object-cover"
          dangerouslySetInnerHTML={{ __html: avatarSvg }}
        />
      ) : (
        <div 
          className="w-full h-full flex items-center justify-center"
          style={{
            backgroundColor: fallbackContent.backgroundColor,
          }}
        >
          <span 
            className="text-white font-semibold"
            style={{ fontSize: fallbackContent.fontSize }}
          >
            {fallbackContent.initials}
          </span>
        </div>
      )}
    </div>
  );
}

