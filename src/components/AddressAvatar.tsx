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
  
  const sizeClass = typeof size === 'number' ? `w-[${size}px] h-[${size}px]` : '';
  const radiusClass = borderRadius === '50%' ? 'rounded-full' : borderRadius.includes('px') ? `rounded-[${borderRadius}]` : 'rounded-lg';
  
  return (
    <div 
      className={`${sizeClass} ${radiusClass} overflow-hidden flex items-center justify-center bg-white/5 border border-white/10 backdrop-blur-sm flex-shrink-0 ${className}`}
      style={{
        width: typeof size === 'string' ? size : undefined,
        height: typeof size === 'string' ? size : undefined,
        borderRadius: borderRadius !== '50%' && !borderRadius.includes('px') ? borderRadius : undefined,
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
            const sizeNum = typeof size === 'number' ? size : 24;
            parent.style.background = `hsl(${address.charCodeAt(0) * 137.508}deg, 70%, 50%)`;
            parent.innerHTML = `<span class="text-white font-semibold" style="font-size: ${sizeNum * 0.4}px;">${address.slice(0, 2).toUpperCase()}</span>`;
          }
        }}
      />
    </div>
  );
}
