import { TokenDto } from "@/api/generated/models/TokenDto";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { TokensService } from "../../../api/generated/services/TokensService";
import { useAeSdk } from "../../../hooks/useAeSdk";
import { useOwnedTokens } from "../../../hooks/useOwnedTokens";

// Components
// import CommentsList from "../../../components/Trendminer/CommentsList";
import TokenTopicFeed from "../../social/components/TokenTopicFeed";
import TokenTopicComposer from "../../social/components/TokenTopicComposer";
import LatestTransactionsCarousel from "../../../components/Trendminer/LatestTransactionsCarousel";
import Token24hChange from "../../../components/Trendminer/Token24hChange";
import TokenHolders from "../../../components/Trendminer/TokenHolders";
import TokenTrades from "../../../components/Trendminer/TokenTrades";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
  Card
} from "../../../components/ui/card";
import ShareModal from "../../../components/ui/ShareModal";

// Feature components
import TokenCandlestickChart from "@/components/charts/TokenCandlestickChart";
import {
  TokenCandlestickChartSkeleton,
  TokenRanking,
  TokenSaleSidebarSkeleton,
  TokenTradeCard
} from "..";
import { TokenSummary } from "../../bcl/components";
import { useLiveTokenData } from "../hooks/useLiveTokenData";


// Tab constants
const TAB_DETAILS = "details";
const TAB_CHAT = "posts";
const TAB_TRANSACTIONS = "transactions";
const TAB_HOLDERS = "holders";

type TabType =
  | typeof TAB_DETAILS
  | typeof TAB_CHAT
  | typeof TAB_TRANSACTIONS
  | typeof TAB_HOLDERS;

//
export default function TokenSaleDetails() {
  const { tokenName } = useParams<{ tokenName: string }>();
  const navigate = useNavigate();
  const { activeAccount } = useAeSdk();

  // State
  const [activeTab, setActiveTab] = useState<TabType>(TAB_CHAT);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDeployedMessage, setShowDeployedMessage] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [tradeActionSheet, setTradeActionSheet] = useState(false);
  const [performance, setPerformance] = useState<any | null>(null);
  const [pendingLastsLong, setPendingLastsLong] = useState(false);
  const { ownedTokens } = useOwnedTokens();

  // Ensure token page starts at top on mount
  useEffect(() => {
    try { window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }); } catch { window.scrollTo(0, 0); }
  }, []);

  // Check if token is newly created (from local storage or state)
  const isTokenNewlyCreated = useMemo(() => {
    try {
      const recentTokens = JSON.parse(
        localStorage.getItem("recentlyCreatedTokens") || "[]"
      );
      return recentTokens.includes(tokenName);
    } catch {
      return false;
    }
  }, [tokenName]);

  // Token data query
  const {
    isError,
    isLoading,
    data: _token,
    error,
  } = useQuery<TokenDto | null>({
    queryKey: ["TokensService.findByAddress", tokenName],
    queryFn: async () => {
      if (!tokenName) throw new Error("Token name is required");
      const result = await TokensService.findByAddress({ address: tokenName });
      if (!result) {
        throw new Error("Token not found");
      }
      return result;
    },
    retry: (failureCount) => {
      if (failureCount > 3) {
        setPendingLastsLong(true);
      }
      return isTokenNewlyCreated ? true : failureCount <= 3;
    },
    retryDelay: 5000,
    staleTime: 60000,
    enabled: !!tokenName,
  });

  const { tokenData } = useLiveTokenData({ token: _token });

  const token = useMemo(() => {
    return {
      ..._token,
      ...(tokenData || {}),
    };
  }, [tokenData, _token]);

  // Derived states
  const isTokenPending = isTokenNewlyCreated && !token?.sale_address;
  const isMobile = window.innerWidth < 768;

  // Share URL
  const shareUrl = useMemo(() => {
    return window.location.href;
  }, []);

  // Check if user owns this token
  const ownsThisToken = useMemo(() => {
    // This would need to be implemented based on your wallet/account system
    return token && ownedTokens
      ? ownedTokens.some((it: any) => it.id === token.id)
      : false;
  }, [activeAccount, token]);

  // Render error state (token not found)
  if (isError && !isTokenNewlyCreated) {
    return (
      <div className="max-w-[min(1536px,100%)] mx-auto min-h-screen  text-white px-4">
        <div className="text-center relative z-10 py-16">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Token{" "}
            <span className="bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] bg-clip-text text-transparent">
              <span className="text-white/60 text-[.9em] mr-0.5 align-baseline">#</span>
              <span>{tokenName}</span>
            </span>{" "}
            not found
          </h1>
          <p className="text-white/70 text-lg mb-8">
            This token doesn't exist yet, but you can create it!
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/trends/tokens")}
              className="border-white/20 bg-white/5 text-white hover:bg-white/10"
            >
              ← Back to Token List
            </Button>
            <Button
              size="lg"
              onClick={() => navigate(`/trends/create?name=${tokenName}`)}
              className="bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] hover:shadow-lg"
            >
              Claim It
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Render pending state
  if (isTokenPending) {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <LatestTransactionsCarousel />

        <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-2">
            Token Creation Pending...
          </h2>
          <p className="text-white/70">
            {pendingLastsLong
              ? "Oops, the miners seem to be busy at the moment. The creation might take a bit longer than expected."
              : "Your transaction has been sent to the network. Waiting for it to be picked up and mined."}
          </p>
          <div className="w-full bg-white/10 rounded-full h-2 mt-4">
            <div className="bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] h-2 rounded-full animate-pulse w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center min-h-48 p-10 text-center text-white/80">
        Token not found
      </div>
    );
  }

  return (
    <div className="max-w-[min(1536px,100%)] mx-auto min-h-screen  text-white px-4">
      <LatestTransactionsCarousel />

      {/* Deploy Success Message */}
      {showDeployedMessage && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
              ✓
            </div>
            <div>
              <h3 className="font-semibold text-green-400">
                Token Deployed Successfully!
              </h3>
              <p className="text-green-300/70 text-sm">
                Your token is now live on the blockchain.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeployedMessage(false)}
            className="text-green-400 hover:text-green-300"
          >
            ×
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Desktop Sidebar (Left Column) */}
        {!isMobile && (
          <div className="lg:col-span-1 flex flex-col gap-6">
            {!token?.sale_address ? (
              <TokenSaleSidebarSkeleton boilerplate={isTokenPending} />
            ) : (
              <>
                <TokenTradeCard token={token} />
                <TokenSummary
                  token={token}
                />
                <TokenRanking token={token} />
                {/* Moved Quali chat CTA into left sidebar (kept simple link) */}
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4">
                  <h4 className="text-white/90 font-semibold mb-2">Community Chat</h4>
                  <p className="text-white/70 text-sm mb-3">Join token rooms on Quali.chat</p>
                  {/* We keep the existing CTA logic in TokenChat component; for now provide a generic link */}
                  <a href={`https://app.quali.chat/`} target="_blank" rel="noopener noreferrer" className="text-[#4ecdc4] underline">
                    Open Quali.chat ↗
                  </a>
                </div>
              </>
            )}
          </div>
        )}

        {/* Main Content (Right Column on Desktop, Full Width on Mobile) */}
        <div
          className={`${isMobile ? "col-span-1 mb-8" : "lg:col-span-2"
            } flex flex-col gap-6`}
        >
          {/* Token Header */}
          <Card className="bg-white/[0.02] border-white/10">
            <div className="p-2">
              {(isLoading && !token?.sale_address) ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="bg-gradient-to-r from-white/10 via-white/20 to-white/10 bg-[length:200%_100%] animate-skeleton-loading rounded-lg w-48 h-8" />
                    <div className="flex items-center gap-2">
                      {Array.from({ length: isTokenPending ? 1 : 2 }).map((_, index) => (
                        <div key={index} className="bg-gradient-to-r from-white/10 via-white/20 to-white/10 bg-[length:200%_100%] animate-skeleton-loading rounded-full px-3 py-1 w-20 h-6" />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-gradient-to-r from-white/10 via-white/20 to-white/10 bg-[length:200%_100%] animate-skeleton-loading rounded-lg w-16 h-8" />
                    <div className="bg-gradient-to-r from-white/10 via-white/20 to-white/10 bg-[length:200%_100%] animate-skeleton-loading rounded-lg w-8 h-8" />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent leading-tight">
                      <span className="text-white/60 text-[.9em] mr-0.5 align-baseline">#</span>
                      <span>{token.symbol || token.name}</span>
                    </h1>

                    <div className="flex items-center gap-2 flex-wrap">
                      {token.rank && (
                        <Badge
                          variant="secondary"
                          className="bg-gradient-to-r from-slate-600/80 to-slate-700/80 text-white text-xs font-medium px-2.5 py-1 rounded-full border-0 shadow-sm"
                        >
                          RANK #{token.rank}
                        </Badge>
                      )}
                      {ownsThisToken && (
                        <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-medium px-2.5 py-1 rounded-full border-0 shadow-sm">
                          OWNED
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Token24hChange
                      tokenAddress={token.address || token.sale_address}
                      createdAt={token.created_at}
                      performance24h={performance}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowShareModal(true)}
                      className="border-white/20 bg-white/5 text-white hover:bg-white/10 rounded-lg shadow-sm transition-all duration-200 hover:shadow-md"
                    >
                      🔗
                    </Button>
                  </div>
                </div>
              )}

              {/* Description */}
              {!isLoading && !isTokenPending && token.metaInfo?.description && (
                <div className="text-white/75 text-sm leading-relaxed mt-3 max-w-[720px]">
                  <span>
                    {descriptionExpanded ||
                      !isMobile ||
                      token.metaInfo.description.length <= 150
                      ? token.metaInfo.description
                      : `${token.metaInfo.description.substring(0, 150)}...`}
                  </span>
                  {isMobile && token.metaInfo.description.length > 150 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setDescriptionExpanded(!descriptionExpanded)
                      }
                      className="text-purple-400 hover:text-white ml-2 p-0 h-auto font-medium underline-offset-2 hover:underline"
                    >
                      {descriptionExpanded ? "Show Less" : "Show More"}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Chart */}
          {(isLoading && !token?.sale_address) ? (
            <TokenCandlestickChartSkeleton boilerplate={isTokenPending} />
          ) : (
            <TokenCandlestickChart token={token} className="w-full" />
          )}
          {/* Tabs Section */}
          {/* Tab Headers */}
          <div className="flex border-b border-white/10">
            {isMobile && (
              <button
                onClick={() => setActiveTab(TAB_DETAILS)}
                className={`flex-1 px-4 py-3 text-[10px] font-bold transition-colors ${activeTab === TAB_DETAILS
                  ? "text-white border-b-2 border-[#4ecdc4]"
                  : "text-white/60 hover:text-white"
                  }`}
              >
                Info
              </button>
            )}
            <button
              onClick={() => setActiveTab(TAB_CHAT)}
              className={`flex-1 px-4 py-3 text-[10px] font-bold transition-colors ${activeTab === TAB_CHAT
                ? "text-white border-b-2 border-[#4ecdc4]"
                : "text-white/60 hover:text-white"
                }`}
            >
              Posts
            </button>
            <button
              onClick={() => setActiveTab(TAB_TRANSACTIONS)}
              className={`flex-1 px-4 py-3 text-[10px] font-bold transition-colors ${activeTab === TAB_TRANSACTIONS
                ? "text-white border-b-2 border-[#4ecdc4]"
                : "text-white/60 hover:text-white"
                }`}
            >
              {isMobile ? "History" : "Transactions"}
            </button>
            <button
              onClick={() => setActiveTab(TAB_HOLDERS)}
              className={`flex-1 px-4 py-3 text-[10px] font-bold transition-colors ${activeTab === TAB_HOLDERS
                ? "text-white border-b-2 border-[#4ecdc4]"
                : "text-white/60 hover:text-white"
                }`}
            >
              Holders ({token.holders_count || 0})
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-0 md:p-1">
            {isMobile && activeTab === TAB_DETAILS && (
              <div className="space-y-4">
                <TokenSummary
                  token={{ ...token, decimals: String(token.decimals ?? '') as any }}
                />
              </div>
            )}

            {activeTab === TAB_CHAT && (
              <div className="grid gap-3">
                <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 md:p-5 backdrop-blur-[5px] relative z-0">
                  <TokenTopicComposer tokenName={(token.name || token.symbol || '').toString()} />
                </div>
                <TokenTopicFeed topicName={`#${String(token.name || token.symbol || '').toLowerCase()}`} />
              </div>
            )}

            {activeTab === TAB_TRANSACTIONS && (
              <TokenTrades token={token} />
            )}

            {activeTab === TAB_HOLDERS && <TokenHolders token={token} />}
          </div>
        </div>
      </div>

      {/* Mobile Trading Bottom Sheet */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/trends/tokens")}
              className="border-white/20 bg-white/5 text-white hover:bg-white/10"
            >
              ←
            </Button>
            <Button
              onClick={() => setTradeActionSheet(true)}
              className="flex-1 bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] hover:shadow-lg"
            >
              Trade Token
            </Button>
          </div>
        </div>
      )}

      {/* Mobile Trading Modal */}
      {(tradeActionSheet && token?.sale_address) && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
          <div className="w-full bg-white/[0.02] border-t border-white/10 rounded-t-3xl p-6 backdrop-blur-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Trade Token</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTradeActionSheet(false)}
                className="text-white"
              >
                ×
              </Button>
            </div>
            <TokenTradeCard
              token={token}
              onClose={() => setTradeActionSheet(false)}
            />
          </div>
        </div>
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareUrl={shareUrl}
        title={`Share ${token.name || token.symbol || "Token"}`}
      />
    </div>
  );
}
