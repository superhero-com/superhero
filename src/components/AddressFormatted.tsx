import React, { useMemo } from 'react';
import { formatAddress, validateHash } from '../utils/address';
import { cn } from '../lib/utils';
import Truncate from './Truncate';

interface AddressFormattedProps {
  address: string;
  columnCount?: number;
  alignRight?: boolean;
  className?: string;
  truncate?: boolean;
  truncateFixed?: boolean;
  chunked?: boolean;
}

export const AddressFormatted = ({
  address,
  columnCount = 6,
  alignRight = false,
  className,
  truncate = false,
  truncateFixed = false,
  chunked = false,
}: AddressFormattedProps) => {
  const maxLength = 3;

  const prepareChunk = (chunk: string): string => (chunk.length === maxLength ? chunk : `${chunk}${' '.repeat(maxLength - chunk.length)}`);

  const isAddress = useMemo(() => validateHash(address).valid, [address]);

  const addressChunks = useMemo(() => address?.match(/.{1,3}/g)?.map(prepareChunk) || [], [address]);

  const cssVariables = useMemo(() => ({
    '--column-width': `${100 / columnCount}%`,
  } as React.CSSProperties), [columnCount]);

  if (!isAddress) {
    return truncate ? (
      <Truncate
        str={address}
        fixed={truncateFixed}
        right={alignRight}
        className={className}
      />
    ) : (
      <span className={className}>{address}</span>
    );
  }

  // If truncate is enabled, use Truncate component for the full address
  if (truncate) {
    return (
      <Truncate
        str={address}
        fixed={truncateFixed}
        right={alignRight}
        className={className}
      />
    );
  }

  if (chunked) {
    return (
      <div
        className={cn(
          'inline-flex flex-wrap',
          'tracking-[0.15em]',
          className,
        )}
        style={cssVariables}
      >
        {addressChunks.map((chunk, index) => (
          <span
            key={index}
            className={cn(
              'flex-none whitespace-nowrap text-left',
              alignRight && 'text-right whitespace-pre-wrap',
            )}
            style={{
              flexBasis: 'var(--column-width)',
            }}
          >
            {chunk}
          </span>
        ))}
      </div>
    );
  }

  return (
    <span className={cn(
      className,
      // Smaller font for ak_ full addresses; even smaller on mobile
      address.startsWith('ak_') && 'text-[8.5px] md:text-[11px] font-light font-mono',
    )}
    >
      {formatAddress(address, 10, true)}
    </span>
  );
};

export default AddressFormatted;
