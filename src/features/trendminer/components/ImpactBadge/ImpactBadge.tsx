import React from 'react';
import { cn } from '../../../../lib/utils';

interface ImpactBadgeProps {
  isPositive: boolean;
  isZero: boolean;
  percentage: string;
}

export default function ImpactBadge({ isPositive, isZero, percentage }: ImpactBadgeProps) {

  return (
    <span className={cn(
      "px-2 py-1 rounded text-xs font-medium",
      isPositive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
    )}>
      {isZero ? '' : isPositive ? '+' : '-'}
      {percentage}%
    </span>
  );
}
