import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Encoded } from "@aeternity/aepp-sdk";
import { useDaoVote } from "@/features/dao/hooks/useDaoVote";
import { useAeSdk } from "@/hooks";
import { useAccount } from "@/hooks";

// UI Components
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

// Custom Components
import AddressAvatarWithChainNameFeed from "@/@components/Address/AddressAvatarWithChainNameFeed";
import VoteSubject from "./VoteSubject";
import VotersTable from "./VotersTable";

interface VoteDetailProps {
  address: Encoded.ContractAddress;
  voteId: bigint;
  saleAddress: Encoded.ContractAddress;
  isCompact?: boolean;
}

export default function VoteDetail({
  address,
  voteId,
  saleAddress,
  isCompact = false,
}: VoteDetailProps) {
  const navigate = useNavigate();
  const { currentBlockHeight } = useAeSdk();
  const { activeAccount } = useAccount();
  
  const {
    voteState,
    voteStateLabel,
    canVote,
    canRevokeVote,
    canWithdraw,
    canApply,
    voteYesPercentage,
    voteStakeYesPercentage,
    userVoteOrLockedInfo,
    actionLoading,
    voteOption,
    revokeVote,
    withdraw,
  } = useDaoVote({
    tokenSaleAddress: saleAddress,
    voteAddress: address,
    voteId: voteId,
  });

  const [showVoters, setShowVoters] = useState(false);

  // Loading state
  if (!voteState) {
    return (
      <Card className="bg-white/[0.02] border-white/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/20"></div>
            <span className="ml-3 text-slate-400">Loading vote details...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isOpen = currentBlockHeight < voteState.close_height;
  const isMobile = window.innerWidth < 768;

  const formatDate = (height: bigint) => {
    const timeDiff = (Number(height) - currentBlockHeight) * 3 * 60 * 1000;
    return new Date(Date.now() + timeDiff).toDateString();
  };

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
    if (voteYesPercentage && voteYesPercentage > 0.5) return "bg-green-500/20 text-green-400 border-green-500/30";
    return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  };

  const getVoteStatusText = () => {
    if (!isOpen) return "Closed";
    if (voteYesPercentage && voteYesPercentage > 0.5) return "Passing";
    return "Open";
  };

  // Compact view for vote lists
  if (isCompact) {
    return (
      <Card className="bg-white/[0.02] border-white/10 hover:bg-white/[0.04] transition-all duration-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <VoteSubject voteState={voteState} />
            <Badge
              variant="secondary"
              className={getVoteStatusColor()}
            >
              {getVoteStatusText()}
            </Badge>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4 text-white/60">
              <span>By: <AddressAvatarWithChainNameFeed address={voteState.author} /></span>
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
                navigate(`/trendminer/dao/${saleAddress}/vote/${voteId.toString()}/${address.toString()}`);
              }}
            >
              View Details
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Full detailed view
  return (
    <div className="space-y-6">
      {/* Vote Header */}
      <Card className="bg-white/[0.02] border-white/10">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold text-white">
              Vote #{voteId.toString()}
            </CardTitle>
            <Badge
              variant="secondary"
              className={getVoteStatusColor()}
            >
              {getVoteStatusText()}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Vote Subject */}
          <div>
            <VoteSubject voteState={voteState} />
          </div>

          {/* Vote Progress */}
          {voteYesPercentage !== undefined && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-white/80">Vote Progress</span>
                <span className="text-sm text-white/60">
                  {Math.round(voteYesPercentage * 100)}% Yes
                </span>
              </div>
              <Progress 
                value={voteYesPercentage * 100} 
                className="h-2 bg-white/10"
              />
              <div className="flex justify-between text-xs text-white/60">
                <span>No ({Math.round((1 - voteYesPercentage) * 100)}%)</span>
                <span>Yes ({Math.round(voteYesPercentage * 100)}%)</span>
              </div>
            </div>
          )}

          {/* Vote Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-white/60 font-medium min-w-[120px]">Proposed By:</span>
                <AddressAvatarWithChainNameFeed address={voteState.author} />
              </div>
              
              {voteState?.create_height && (
                <div className="flex items-center gap-2">
                  <span className="text-white/60 font-medium min-w-[120px]">Created:</span>
                  <span className="text-white">{formatDate(voteState.create_height)}</span>
                </div>
              )}

              {voteState?.close_height && (
                <div className="flex items-center gap-2">
                  <span className="text-white/60 font-medium min-w-[120px]">
                    {isOpen ? "Closes:" : "Closed:"}
                  </span>
                  <span className="text-white">
                    {formatDate(voteState.close_height)}
                    {isOpen && (
                      <span className="ml-2 text-yellow-400 text-xs">
                        ({formatTimeRemaining(voteState.close_height)})
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {voteState?.metadata?.link && (
                <div className="flex items-center gap-2">
                  <span className="text-white/60 font-medium min-w-[120px]">Link:</span>
                  <a 
                    href={voteState.metadata.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    View Proposal
                  </a>
                </div>
              )}

              {userVoteOrLockedInfo && (
                <div className="flex items-center gap-2">
                  <span className="text-white/60 font-medium min-w-[120px]">Your Status:</span>
                  <span className="text-white/80 text-sm">{userVoteOrLockedInfo}</span>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {voteState?.metadata?.description && (
            <div>
              <div className="text-white/60 font-medium mb-2">Description:</div>
              <div className="text-white/80 bg-white/5 rounded-lg p-4 border border-white/10">
                {voteState.metadata.description}
              </div>
            </div>
          )}

          <Separator className="bg-white/10" />

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            {canVote && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => voteOption(true)}
                  disabled={actionLoading}
                  className="border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20"
                >
                  Vote Yes
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => voteOption(false)}
                  disabled={actionLoading}
                  className="border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                >
                  Vote No
                </Button>
              </div>
            )}

            {canRevokeVote && (
              <Button
                variant="outline"
                size="sm"
                onClick={revokeVote}
                disabled={actionLoading}
                className="border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"
              >
                Revoke Vote
              </Button>
            )}

            {canWithdraw && (
              <Button
                variant="outline"
                size="sm"
                onClick={withdraw}
                disabled={actionLoading}
                className="border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
              >
                Withdraw
              </Button>
            )}


            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowVoters(!showVoters)}
              className="border-white/20 bg-white/5 text-white hover:bg-white/10"
            >
              {showVoters ? "Hide" : "Show"} Voters
            </Button>
          </div>

          {actionLoading && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white/20"></div>
              <span className="ml-3 text-white/60">Processing...</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Voters Table */}
      {showVoters && (
        <Card className="bg-white/[0.02] border-white/10">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-white">Voters</CardTitle>
          </CardHeader>
          <CardContent>
            <VotersTable voteState={voteState} token={{ address: saleAddress }} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
