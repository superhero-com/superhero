import { useLatestTransactions } from '@/hooks/useLatestTransactions';
import type { ReactNode } from 'react';
import LatestTransactionsStrip from './LatestTransactionsStrip';

const LatestTransactionsCarousel = ({ headerStart }: { headerStart?: ReactNode }) => {
  const { latestTransactions } = useLatestTransactions();
  return <LatestTransactionsStrip transactions={latestTransactions} headerStart={headerStart} />;
};

export default LatestTransactionsCarousel;
