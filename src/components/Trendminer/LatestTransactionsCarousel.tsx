import { useLatestTransactions } from '@/hooks/useLatestTransactions';
import LatestTransactionsStrip from './LatestTransactionsStrip';

const LatestTransactionsCarousel = () => {
  const { latestTransactions } = useLatestTransactions();
  return <LatestTransactionsStrip transactions={latestTransactions} />;
};

export default LatestTransactionsCarousel;
