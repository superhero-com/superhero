import { useNavigate } from "react-router-dom";
import { Encoded } from "@aeternity/aepp-sdk";
import { useDaoVote } from "@/features/dao/hooks/useDaoVote";
import { useAeSdk } from "@/hooks";

// UI Components
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

// Custom Components
import AddressAvatarWithChainNameFeed from "@/@components/Address/AddressAvatarWithChainNameFeed";
import VoteSubject from "./VoteSubject";
import Spinner from "@/components/Spinner";

interface TokenVoteCardProps {
  address: Encoded.ContractAddress;
  voteId: bigint;
  saleAddress: Encoded.ContractAddress;
}

export default function TokenVoteCard({
  address,
  voteId,
  saleAddress,
}: TokenVoteCardProps) {
  const navigate = useNavigate();
  const { currentBlockHeight } = useAeSdk();

  const { voteState, voteYesPercentage } = useDaoVote({
    tokenSaleAddress: saleAddress,
    voteAddress: address,
    voteId: voteId,
  });

  // Loading state
  if (!voteState) {
    return (
      <Card className="bg-white/[0.02] border-white/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-center py-4">
            <Spinner className="w-6 h-6" />
            <span className="ml-3 text-slate-400">Loading...</span>
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
      return `${daysRemaining}d ${hoursRemaining % 24}h remaining`;
    } else if (hoursRemaining > 0) {
      return `${hoursRemaining}h ${minutesRemaining % 60}m remaining`;
    } else {
      return `${minutesRemaining}m remaining`;
    }
  };

  const getVoteStatusColor = () => {
    if (!isOpen) return "bg-red-500/20 text-red-400 border-red-500/30";
    if (voteYesPercentage && voteYesPercentage > 0.5)
      return "bg-green-500/20 text-green-400 border-green-500/30";
    return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  };

  const getVoteStatusText = () => {
    if (!isOpen) return "Closed";
    if (voteYesPercentage && voteYesPercentage > 0.5) return "Passing";
    return "Open";
  };

  return (
    <Card className="bg-white/[0.02] border-white/10 hover:bg-white/[0.04] transition-all duration-200">
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
              <span className="text-white/80"> By: </span>{" "}
              <AddressAvatarWithChainNameFeed address={voteState.author} />
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
                `/trends/dao/${saleAddress}/vote/${voteId.toString()}/${address.toString()}`
              );
            }}
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
