import React, { useMemo } from 'react';
// @ts-ignore - multiavatar doesn't have types but works fine
import multiavatar from '@multiavatar/multiavatar';

type IdenticonProps = {
  address: string;
  size?: number;
  name?: string;
};

const Identicon = ({ address, size = 32, name }: IdenticonProps) => {
  const svgString = useMemo(() => multiavatar(name || address, true), [name, address]);

  return (
    <span style={{ display: 'inline-grid', placeItems: 'center' }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.14)',
          overflow: 'hidden',
          transition: 'transform .15s ease, box-shadow .15s ease',
        }}
        className="identicon-img"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: svgString }}
      />
      <style>
        {`
          .identicon-img:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
        `}
      </style>
    </span>
  );
};

export default Identicon;
