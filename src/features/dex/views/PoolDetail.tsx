import { DexPairService } from '@/api/generated';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { PoolCandlestickChart } from '../components/charts/PoolCandlestickChart';
import {
  PoolHeader,
  PoolStatsOverview,
  PoolTransactions,
} from '../components/PoolDetail';

const PoolDetail = () => {
  const { poolAddress, id } = useParams();
  // Support both :poolAddress (new routes) and :id (legacy routes)
  const address = poolAddress || id || '';

  const {
    data: pairData, isPending: loading, isError: failed, refetch,
  } = useQuery({
    queryFn: () => DexPairService.getPairByAddress({ address: address! }),
    queryKey: ['DexPairService.getPairByAddress', address],
    enabled: !!address,
  });

  const {
    data: pairSummary, isPending: summaryLoading, isError: summaryFailed, refetch: refetchSummary,
  } = useQuery({
    queryFn: () => DexPairService.getPairSummary({ address: address! }),
    queryKey: ['DexPairService.getPairSummary', address],
    enabled: !!address,
  });

  return (
    <div className="mx-auto md:px-5 md:py-0 flex flex-col gap-6 md:gap-8 min-h-screen">
      <PoolHeader
        address={address}
        pairData={pairData}
        loading={loading}
        failed={failed}
        onRetry={() => { refetch(); }}
      />
      {pairData && !failed && (
      <>
        <PoolStatsOverview
          key={address}
          pairData={pairData}
          pairSummary={pairSummary}
          loading={summaryLoading}
          failed={summaryFailed}
          onRetry={() => { refetchSummary(); }}
        />
        <PoolCandlestickChart
          className="w-full"
          pairAddress={pairData.address}
          height={400}
        />

        {/* Recent Transactions */}
        <section id="pool-transactions" tabIndex={-1} className="scroll-mt-6">
          <PoolTransactions poolAddress={address} />
        </section>
      </>
      )}
    </div>
  );
};

export default PoolDetail;
