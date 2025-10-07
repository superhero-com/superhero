import { TokensService } from "@/api/generated";
import AeButton from "@/components/AeButton";
import VoteSubject from "@/features/dao/components/VoteSubject";
import { useDaoVote } from "@/features/dao/hooks/useDaoVote";
import { useAeSdk } from "@/hooks";
import { ensureAddress, ensureString } from "@/utils/common";
import { Encoded, Encoding } from "@aeternity/aepp-sdk";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import VotersTable from "@/features/dao/components/VotersTable";
import { Decimal } from "@/libs/decimal";
import TokenTradeCard from "@/features/trending/components/TokenTradeCard";
import TokenSummary from "@/features/bcl/components/TokenSummary";
import TokenRanking from "@/features/trending/components/TokenRanking";

export default function VoteView() {
  const { saleAddress, voteAddress, voteId } = useParams<{
    saleAddress: string;
    voteAddress: string;
    voteId: string;
  }>();

  const { currentBlockHeight } = useAeSdk();

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

  const isOpen = voteState
    ? currentBlockHeight < voteState.close_height
    : false;

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
                  to={`/trending/dao/${saleAddress}`}
                  className="text-blue-400 hover:text-blue-300 transition-colors duration-200"
                >
                  ← Back to Treasury
                </Link>
              </div>

              {/* Vote card */}
              <div className="border border-white/10 rounded-xl bg-black/20 backdrop-blur-lg text-white shadow-lg mb-6">
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                  <div className="flex justify-between items-center">
                    <VoteSubject voteState={voteState} />
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        isOpen
                          ? "bg-green-500/20 text-green-400 border border-green-500/30"
                          : "bg-red-500/20 text-red-400 border border-red-500/30"
                      }`}
                    >
                      {isOpen ? "Open" : "Closed"}
                    </span>
                  </div>
                </div>

                {/* Vote details */}
                <div className="p-6 space-y-4">
                  {voteState?.metadata?.link && (
                    <div>
                      <strong className="item-label">Proposed by:</strong>
                      <span className="ml-2 text-blue-400">
                        {voteState.author}
                      </span>
                    </div>
                  )}

                  {voteState?.create_height && (
                    <div>
                      <strong className="item-label">Created at:</strong>
                      <span className="ml-2">
                        {formatDate(voteState.create_height)}
                      </span>
                    </div>
                  )}

                  {voteState?.close_height && (
                    <div>
                      <strong className="item-label">
                        {isOpen ? "Open Until:" : "Expired at:"}
                      </strong>
                      <span className="ml-2">
                        {formatDate(voteState.close_height)}
                      </span>
                    </div>
                  )}

                  {voteState?.metadata?.description && (
                    <div>
                      <div className="item-label">Description:</div>
                      <div className="text-white/80 mt-1">
                        {voteState.metadata.description}
                      </div>
                    </div>
                  )}

                  {voteState?.metadata?.link && (
                    <div>
                      <strong className="item-label">Link:</strong>
                      <a
                        href={voteState.metadata.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-blue-400 hover:text-blue-300 transition-colors duration-200"
                      >
                        {voteState.metadata.link}
                      </a>
                    </div>
                  )}
                </div>

                {/* User vote info */}
                {userVoteOrLockedInfo && (
                  <div className="px-6 py-4 bg-white/5 border-t border-white/10">
                    <div className="text-sm text-white/80">
                      {userVoteOrLockedInfo}
                    </div>
                  </div>
                )}

                {/* Vote progress */}
                <div className="p-6 border-t border-white/10">
                  <div className="relative">
                    <div className="w-full bg-red-500/20 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all duration-300"
                        style={{ width: `${voteYesPercentage || 0}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span>Agree</span>
                      <span>Disagree</span>
                    </div>
                  </div>

                  {voteYesPercentage && (
                    <div className="mt-2 text-sm text-white/80">
                      Vote Yes Percentage:{" "}
                      {Decimal.from(voteYesPercentage)?.prettify()}
                    </div>
                  )}

                  {voteStakeYesPercentage && (
                    <div className="mt-1 text-sm text-white/80">
                      Vote Stake Yes Percentage:{" "}
                      {Decimal.from(voteStakeYesPercentage).prettify()}
                    </div>
                  )}
                </div>

                {/* Token balance check */}
                {canVote && !hasTokenBalance && (
                  <div className="p-6 border-t border-white/10 bg-yellow-500/10 border-yellow-500/20">
                    <div className="text-center space-y-4">
                      <div className="text-yellow-400 font-medium">
                        You need {token.symbol} tokens to participate in this
                        vote
                      </div>
                      <div className="text-white/80 text-sm">
                        Get {token.symbol} tokens to vote on this proposal
                      </div>
                      <Link
                        to={`/trending/tokens/${token.symbol}`}
                        className="inline-block"
                      >
                        Get {token.symbol} Tokens
                      </Link>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="p-6 border-t border-white/10">
                  <div className="flex flex-wrap gap-3">
                    {canVote && hasTokenBalance && (
                      <>
                        <AeButton
                          onClick={() => voteOption(true)}
                          disabled={actionLoading}
                          loading={actionLoading}
                          variant="success"
                          size="small"
                        >
                          Vote Agreement
                        </AeButton>
                        <AeButton
                          onClick={() => voteOption(false)}
                          disabled={actionLoading}
                          loading={actionLoading}
                          variant="error"
                          size="small"
                        >
                          Vote Disagreement
                        </AeButton>
                      </>
                    )}

                    {canRevokeVote && (
                      <AeButton
                        onClick={revokeVote}
                        disabled={actionLoading}
                        loading={actionLoading}
                        variant="error"
                        size="small"
                      >
                        Revoke
                      </AeButton>
                    )}

                    {canWithdraw && (
                      <AeButton
                        onClick={withdraw}
                        disabled={actionLoading}
                        loading={actionLoading}
                        variant="error"
                        size="small"
                      >
                        Withdraw
                      </AeButton>
                    )}

                    {canApply && (
                      <AeButton
                        disabled={actionLoading}
                        loading={actionLoading}
                        variant="error"
                        size="small"
                      >
                        Apply
                      </AeButton>
                    )}
                  </div>
                </div>
              </div>

              {/* Voters table */}
              <VotersTable voteState={voteState} token={token} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
