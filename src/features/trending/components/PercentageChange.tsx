import React from 'react';

interface PercentageChangeProps {
  value: number | null | undefined;
  className?: string;
  showSign?: boolean;
}

export default function PercentageChange({ 
  value, 
  className = '',
  showSign = false
}: PercentageChangeProps) {
  if (value === null || value === undefined) {
    return (
      <span className={`text-white/40 text-sm ${className}`}>
        -
      </span>
    );
  }

  const isPositive = value >= 0;
  const formattedValue = Math.abs(value).toFixed(2);
  const sign = showSign ? (isPositive ? '+' : '') : '';

  return (
    <span 
      className={`text-sm font-semibold flex items-center gap-0.5 tabular-nums ${className} ${
        isPositive 
          ? 'text-green-400' 
          : 'text-red-400'
      }`}
    >
      <span className="text-[10px] leading-none">{isPositive ? '▲' : '▼'}</span>
      <span>{sign}{formattedValue}%</span>
    </span>
  );
}




