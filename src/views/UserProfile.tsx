import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AeButton from "../components/AeButton";
import Identicon from "../components/Identicon";
import RightRail from "../components/layout/RightRail";
import Shell from "../components/layout/Shell";
import UserBadge from "../components/UserBadge";

import { useQuery } from "@tanstack/react-query";
import { PostsService } from "../api/generated";
import FeedItem from "../features/social/components/FeedItem";
import { PostApiResponse } from "../features/social/types";
import "../features/social/views/FeedList.scss";
import { useAccountBalances } from "../hooks/useAccountBalances";
import { useChainName } from "../hooks/useChainName";

import AddressAvatar from "../components/AddressAvatar";
import AddressAvatarWithChainName from "@/@components/Address/AddressAvatarWithChainName";

export default function UserProfile() {
  const navigate = useNavigate();
  const { address } = useParams();
  const { decimalBalance, loadAccountData } = useAccountBalances(address);
  const { chainName } = useChainName(address);

  const { data } = useQuery({
    queryKey: ["PostsService.listAll", address],
    queryFn: () =>
      PostsService.listAll({
        limit: 100,
        page: 1,
        orderBy: "created_at",
        orderDirection: "DESC",
        search: "",
        accountAddress: address,
      }) as unknown as Promise<PostApiResponse>,
    enabled: !!address,
  });

  const [profile, setProfile] = useState<any>(null);
  const [tab, setTab] = useState<"feed">("feed");

  // Get posts from the query data
  const posts = data?.items || [];

  useEffect(() => {
    if (!address) return;
    loadAccountData();
    // Load profile
  }, [address]);

  return (
    <Shell right={<RightRail />}>
      <div className="max-w-[880px] mx-auto">
        {/* Compact Profile header */}
        <div className="bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-5 mb-4 relative overflow-hidden transition-all duration-300 hover:border-white/20 hover:shadow-[0_20px_60px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.3)] hover:-translate-y-0.5 md:p-4 md:mb-3 md:rounded-xl">
          <AddressAvatarWithChainName address={address} size={56} showBalance />
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-[#2f2f3b] px-1">
          <AeButton
            onClick={() => setTab("feed")}
            variant="tab"
            active={tab === "feed"}
          >
            Feed
          </AeButton>
          {/* Comments tab removed in unified posts model */}
        </div>

        {tab === "feed" && (
          <div className="feed">
            {posts.length === 0 && (
              <div className="text-center py-12 px-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xl mt-6">
                <div className="text-4xl mb-4 opacity-30">📝</div>
                <div className="text-white font-semibold mb-2">
                  No posts found.
                </div>
                <div className="text-white/60 text-sm">
                  This user hasn't posted anything yet.
                </div>
              </div>
            )}
            {posts.map((item: any) => {
              const postId = item.id;
              const commentCount = item.total_comments ?? 0;

              return (
                <div key={postId} className="mb-4">
                  <FeedItem
                    key={postId}
                    item={item}
                    commentCount={commentCount}
                    onItemClick={(id: string) => navigate(`/post/${id}`)}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* User comments list removed in unified posts model */}
      </div>
    </Shell>
  );
}
