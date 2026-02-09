import Avatars from '@dicebear/avatars';
import sprites from '@dicebear/avatars-avataaars-sprites';
import * as jdenticon from 'jdenticon';
import React, { useMemo } from 'react';

interface AddressAvatarProps {
  address: string;
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
  borderRadius?: string;
}

export const AVATAR_CONFIG = {
  mode: 'exclude',
  accessoriesChance: 28,
  facialHairChance: 27,
  eyes: ['cry', 'close'],
  eyebrow: ['angry', 'sad', 'unibrow'],
  mouth: ['concerned', 'vomit', 'disbelief', 'grimace', 'sad', 'scream'],
  // base64: true,
};

export const JDENTICON_CONFIG = {
  lightness: {
    color: [0.4, 1.0],
    grayscale: [0.5, 1.0],
  },
  saturation: {
    color: 1.0,
    grayscale: 1.0,
  },
  backColor: '#12121bff',
};

export default function AddressAvatar({
  address,
  size = 24,
  className = '',
  borderRadius = '50%',
  style = {},
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
        const avatar = new Avatars(sprites, AVATAR_CONFIG);

        return avatar.create(address);
      }
      // Use jdenticon for non-.chain addresses
      return jdenticon.toSvg(address, (avatarSize * 0.95), JDENTICON_CONFIG);
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
        fontSize: '12px',
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
        ...style,
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
