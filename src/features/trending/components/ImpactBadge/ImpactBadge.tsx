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
      isPositive ? 'bg-bull/10 text-bull' : 'bg-bear/10 text-bear',
    )}
    >
      {sign}
      {percentage}
      %
    </span>
  );
};

export default ImpactBadge;
