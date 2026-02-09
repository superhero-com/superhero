import React from 'react';
import { cn } from '../../../../lib/utils';

interface ImpactBadgeProps {
  isPositive: boolean;
  isZero: boolean;
  percentage: string;
}

const ImpactBadge = ({ isPositive, isZero, percentage }: ImpactBadgeProps) => {
  let sign = '';
  if (!isZero) {
    sign = isPositive ? '+' : '-';
  }
  return (
    <span className={cn(
      'px-2 py-1 rounded text-xs font-medium',
      isPositive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800',
    )}
    >
      {sign}
      {percentage}
      %
    </span>
  );
};

export default ImpactBadge;
