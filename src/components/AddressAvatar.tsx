import React from 'react';

interface AddressAvatarProps {
  address: string;
  size?: number;
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
  // Using a simple avatar service - you can replace this with your preferred service
  const avatarUrl = `https://avatars.superherowallet.com/${address}`;
  
  return (
    <div 
      className={`address-avatar ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: borderRadius,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        flexShrink: 0,
        ...style
      }}
    >
      <img
        src={avatarUrl}
        alt={`Avatar for ${address}`}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
        onError={(e) => {
          // Fallback to a simple colored circle with initials
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            parent.style.background = `hsl(${address.charCodeAt(0) * 137.508}deg, 70%, 50%)`;
            parent.innerHTML = `<span style="color: white; font-size: ${size * 0.4}px; font-weight: 600;">${address.slice(0, 2).toUpperCase()}</span>`;
          }
        }}
      />
    </div>
  );
}
