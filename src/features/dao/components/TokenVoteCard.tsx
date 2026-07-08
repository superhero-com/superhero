import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Encoded } from '@aeternity/aepp-sdk';
import { useDaoVote } from '@/features/dao/hooks/useDaoVote';
import { useAeSdk } from '@/hooks';

// UI Components
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

// Custom Components
import { AddressAvatarWithChainName } from '@/@components/Address/AddressAvatarWithChainName';
import Spinner from '@/components/Spinner';
import VoteSubject from './VoteSubject';

interface TokenVoteCardProps {
  address: Encoded.ContractAddress;
  voteId: bigint;
  saleAddress: Encoded.ContractAddress;
}

const TokenVoteCard = ({
  address,
  voteId,
  saleAddress,
}: TokenVoteCardProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentBlockHeight } = useAeSdk();

  const { voteState, voteYesPercentage } = useDaoVote({
    tokenSaleAddress: saleAddress,
    voteAddress: address,
    voteId,
  });

  // Loading state
  if (!voteState) {
    return (
      <Card className="liquid-glass rounded-xl">
        <CardContent className="p-4">
          <div className="flex items-center justify-center py-4">
            <Spinner className="w-6 h-6" />
            <span className="ml-3 text-slate-400">{t('dao.loading')}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isOpen = currentBlockHeight < voteState.close_height;

  const formatTimeRemaining = (height: bigint) => {
    const blocksRemaining = Number(height) - currentBlockHeight;
    const minutesRemaining = blocksRemaining * 3;
    const hoursRemaining = Math.floor(minutesRemaining / 60);
    const daysRemaining = Math.floor(hoursRemaining / 24);

    if (daysRemaining > 0) {
      return t('dao.timeRemaining.daysHours', { days: daysRemaining, hours: hoursRemaining % 24 });
    } if (hoursRemaining > 0) {
      return t('dao.timeRemaining.hoursMinutes', { hours: hoursRemaining, minutes: minutesRemaining % 60 });
    }
    return t('dao.timeRemaining.minutes', { minutes: minutesRemaining });
  };

  const getVoteStatusColor = () => {
    if (!isOpen) return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (voteYesPercentage && voteYesPercentage > 0.5) return 'bg-green-500/20 text-green-400 border-green-500/30';
    return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  };

  const getVoteStatusText = () => {
    if (!isOpen) return t('dao.voteStatus.closed');
    if (voteYesPercentage && voteYesPercentage > 0.5) return t('dao.voteStatus.passing');
    return t('dao.voteStatus.open');
  };

  return (
    <Card className="liquid-glass liquid-glass--hover rounded-xl">
      <CardContent className="p-4">
        <div className="flex flex-col items-start justify-between mb-3 gap-4">
          <Badge variant="secondary" className={getVoteStatusColor()}>
            {getVoteStatusText()}
          </Badge>
          <VoteSubject voteState={voteState} />
        </div>

        <div className="flex items-center justify-between text-sm flex-wrap gap-4">
          <div className="flex items-center gap-4 text-white/60 flex-wrap">
            <div className="flex items-center gap-4">
              <span className="text-white/80">
                {' '}
                {t('dao.byLabel')}
                {' '}
              </span>
              {' '}
              <AddressAvatarWithChainName address={voteState.author} variant="feed" />
            </div>
            {isOpen && (
              <span className="text-yellow-400">
                {formatTimeRemaining(voteState.close_height)}
              </span>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="border-white/20 bg-white/5 text-white hover:bg-white/10"
            onClick={() => {
              navigate(
                `/trends/dao/${saleAddress}/vote/${voteId.toString()}/${address.toString()}`,
              );
            }}
          >
            {t('dao.viewDetails')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TokenVoteCard;
