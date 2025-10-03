import { useState } from "react";
import { TokensService } from "@/api/generated";
import { useDaoVote } from "@/features/dao/hooks/useDaoVote";
import { useAeSdk } from "@/hooks";
import { ensureAddress, ensureString } from "@/utils/common";
import { Encoded, Encoding } from "@aeternity/aepp-sdk";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

// UI Components
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

// Custom Components
import AddressAvatarWithChainNameFeed from "@/@components/Address/AddressAvatarWithChainNameFeed";
import VoteSubject from "@/features/dao/components/VoteSubject";
import VotersTable from "@/features/dao/components/VotersTable";
import { Decimal } from "@/libs/decimal";
import TokenTradeCard from "@/features/trendminer/components/TokenTradeCard";
import TokenSummary from "@/features/bcl/components/TokenSummary";
import TokenRanking from "@/features/trendminer/components/TokenRanking";

export default function DaoVoteDetailsView() {
  const { saleAddress, voteAddress, voteId } = useParams<{
    saleAddress: string;
    voteAddress: string;
    voteId: string;
  }>();

  const { currentBlockHeight } = useAeSdk();
  const [showVoters, setShowVoters] = useState(false);

  // Validate parameters
  if (!saleAddress || !voteAddress || !voteId) {
    return <div className="text-red-400 p-4">Missing required parameters</div>;
  }

  ensureAddress(saleAddress, Encoding.ContractAddress);
  ensureString(saleAddress);
  ensureAddress(voteAddress, Encoding.ContractAddress);
  ensureString(voteAddress);
  ensureString(voteId);

  const {
    hasTokenBalance,
    voteState,
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
    tokenSaleAddress: saleAddress as Encoded.ContractAddress,
    voteAddress: voteAddress as Encoded.ContractAddress,
    voteId: BigInt(voteId),
  });

  const {
    data: token,
    isLoading,
    error,
  } = useQuery({
    queryFn: () => TokensService.findByAddress({ address: saleAddress }),
    queryKey: ["TokensService.findByAddress", saleAddress],
    retry: 3,
    retryDelay: 1000 * 5,
  });

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

  const isOpen = voteState
    ? currentBlockHeight < voteState.close_height
    : false;

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-20 w-20 border-b-2 border-blue-500 mx-auto"></div>
          <div className="text-white/80 mt-4">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-400 p-4">
        Error loading token: {error.message}
      </div>
    );
  }

  if (!token) {
    return <div className="text-slate-400 p-4">Token not found</div>;
  }

  return (
    <div className="max-w-[min(1536px,100%)] mx-auto min-h-screen  text-white px-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left sidebar - Token info (hidden on mobile) */}
        <div className="hidden lg:block lg:col-span-1 space-y-4">
          {/* TokenTradeCard placeholder */}

          <TokenTradeCard token={token} />

          <TokenSummary token={token} />

          <TokenRanking token={token} />
        </div>

        {/* Main content */}
        <div className="lg:col-span-3">
          {voteState && (
            <>
              {/* Back button */}
              <div className="mb-4 flex items-center gap-4">
                <Link
                  to={`/trendminer/dao/${saleAddress}`}
                  className="text-blue-400 hover:text-blue-300 transition-colors duration-200"
                >
                  ← Back to Treasury
                </Link>
              </div>

              {/* Enhanced Vote Card */}
              <div className="space-y-6">
                {/* Vote Header */}
                <Card className="bg-white/[0.02] border-white/10">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl font-semibold text-white">
                        Vote #{voteId}
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white/60 font-medium min-w-[120px]">Proposed By:</span>
                          <AddressAvatarWithChainNameFeed address={voteState.author} />
                        </div>
                        
                        {voteState?.create_height && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white/60 font-medium min-w-[120px]">Created:</span>
                            <span className="text-white">{formatDate(voteState.create_height)}</span>
                          </div>
                        )}

                        {voteState?.close_height && (
                          <div className="flex items-center gap-2 flex-wrap">
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
                          <div className="flex flex-col md:flex-row items-start md:items-center gap-2">
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
                          <div className="flex items-center gap-2 flex-wrap">
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

                    {/* Token balance check */}
                    {canVote && !hasTokenBalance && (
                      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                        <div className="text-center space-y-4">
                          <div className="text-yellow-400 font-medium">
                            You need {token.symbol} tokens to participate in this vote
                          </div>
                          <div className="text-white/80 text-sm">
                            Get {token.symbol} tokens to vote on this proposal
                          </div>
                          <Link
                            to={`/trendminer/tokens/${token.symbol}`}
                            className="inline-block"
                          >
                            <Button variant="outline" size="sm" className="border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20">
                              Get {token.symbol} Tokens
                            </Button>
                          </Link>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3">
                      {canVote && hasTokenBalance && (
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

                      {canApply && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={actionLoading}
                          className="border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20"
                        >
                          Apply
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
                      <VotersTable voteState={voteState} token={token} />
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
