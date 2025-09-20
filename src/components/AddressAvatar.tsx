import React from 'react';

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
  // Using a simple avatar service - you can replace this with your preferred service
  const avatarUrl = `https://avatars.superherowallet.com/${address}`;
  
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
      <img
        src={avatarUrl}
        alt={`Avatar for ${address}`}
        className="w-full h-full object-cover"
        onError={(e) => {
          // Fallback to a simple colored circle with initials
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            // Calculate font size based on actual rendered size for percentage values
            let fontSize = '12px';
            if (typeof size === 'number') {
              fontSize = `${size * 0.4}px`;
            } else if (typeof size === 'string' && size.includes('%')) {
              // For percentage sizes, use a relative font size
              fontSize = '0.4em';
            } else if (typeof size === 'string' && size.includes('px')) {
              const pxValue = parseInt(size.replace('px', ''));
              fontSize = `${pxValue * 0.4}px`;
            }
            
            parent.style.background = `hsl(${address.charCodeAt(0) * 137.508}deg, 70%, 50%)`;
            parent.innerHTML = `<span class="text-white font-semibold" style="font-size: ${fontSize};">${address.slice(0, 2).toUpperCase()}</span>`;
          }
        }}
      />
    </div>
  );
}
