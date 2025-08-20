import React from 'react';
// @ts-ignore - multiavatar doesn't have types but works fine
import multiavatar from '@multiavatar/multiavatar';

export default function Identicon({ address, size = 32, name }: { address: string; size?: number; name?: string }) {
  // Check if this is a .chain name (has a name and it's not 'Legend')
  const isChainName = name && name !== 'Legend' && name !== address;
  
  if (isChainName) {
    // Use multiavatar for .chain names
    const svgString = multiavatar(name, true);
    return (
      <span style={{ display: 'inline-grid', placeItems: 'center' }}>
        <div
          style={{
            width: size,
            height: size,
            borderRadius: 0,
            overflow: 'hidden',
            transition: 'transform .15s ease, box-shadow .15s ease'
          }}
          className="identicon-img"
          dangerouslySetInnerHTML={{ __html: svgString }}
        />
        <style>{`
          .identicon-img:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
        `}</style>
      </span>
    );
  } else {
    // Use multiavatar for addresses as well (no external service)
    const svgString = multiavatar(name || address, true);
    return (
      <span style={{ display: 'inline-grid', placeItems: 'center' }}>
        <div
          style={{
            width: size,
            height: size,
            borderRadius: 0,
            overflow: 'hidden',
            transition: 'transform .15s ease, box-shadow .15s ease'
          }}
          className="identicon-img"
          dangerouslySetInnerHTML={{ __html: svgString }}
        />
        <style>{`
          .identicon-img:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
        `}</style>
      </span>
    );
  }
}


