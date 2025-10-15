import { PostsService } from "@/api/generated/services/PostsService";
import {
  DataTable,
  DataTableResponse,
} from "@/features/shared/components/DataTable";
import ReplyToFeedItem from "@/features/social/components/ReplyToFeedItem";
import TokenCreatedFeedItem from "@/features/social/components/TokenCreatedFeedItem";
import TokenCreatedActivityItem from "@/features/social/components/TokenCreatedActivityItem";
import { PostApiResponse } from "@/features/social/types";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { TrendminerApi } from "@/api/backend";
import type { PostDto } from "@/api/generated";

interface AccountFeedProps {
  address: string;
  tab: string;
}

export default function AccountFeed({ address, tab }: AccountFeedProps) {
  const navigate = useNavigate();
  const [createdActivities, setCreatedActivities] = useState<PostDto[]>([]);

  const fetchFeed = async (params: any) => {
    const response = (await PostsService.listAll({
      ...params,
    })) as unknown as Promise<PostApiResponse>;
    return response as unknown as DataTableResponse<any>;
  };

  // Map Trendminer token -> Post-like activity item
  function mapTokenCreatedToPost(payload: any): PostDto {
    const saleAddress: string = payload?.sale_address || payload?.address || "";
    const name: string = payload?.token_name || payload?.name || "Unknown";
    const createdAt: string = payload?.created_at || new Date().toISOString();
    const encodedName = encodeURIComponent(name);
    const id = `token-created:${encodedName}:${saleAddress}:${createdAt}_v3`;
    return {
      id,
      tx_hash: payload?.tx_hash || "",
      tx_args: [
        { token_name: name },
        { sale_address: saleAddress },
        { kind: "token-created" },
      ],
      sender_address: payload?.creator_address || address || "",
      contract_address: saleAddress || "",
      type: "TOKEN_CREATED",
      content: "",
      topics: ["token:created", `token_name:${name}`, `#${name}`].filter(Boolean) as string[],
      media: [],
      total_comments: 0,
      created_at: createdAt,
    } as PostDto;
  }

  // Load user's created trends as activity items for profile feed
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!address || tab !== "feed") return;
      try {
        const resp = await TrendminerApi.listTokens({
          creatorAddress: address,
          orderBy: "created_at",
          orderDirection: "DESC",
          limit: 20,
        }).catch(() => ({ items: [] }));
        if (cancelled) return;
        const items = (resp?.items || []).map(mapTokenCreatedToPost);
        setCreatedActivities(items);
      } catch {
        if (!cancelled) setCreatedActivities([]);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [address, tab]);

  return (
    <>
      {createdActivities.length > 0 && (
        <div className="flex flex-col gap-0 md:gap-4 mb-3 md:mb-4">
          {createdActivities.map((it) => (
            <TokenCreatedActivityItem key={it.id} item={it} />
          ))}
        </div>
      )}
    <DataTable
      queryFn={fetchFeed}
      renderRow={({ item, index }) => {
        const postId = item.id;
        const isTokenCreated = String(postId).startsWith("token-created:");
        if (isTokenCreated) {
          return (
            <TokenCreatedActivityItem
              key={postId}
              item={item}
            />
          );
        }
        return (
          <ReplyToFeedItem
            key={item.id}
            item={item}
            commentCount={item.total_comments ?? 0}
            allowInlineRepliesToggle={false}
            onOpenPost={(id: string) => navigate(`/post/${String(id).replace(/_v3$/,'')}`)}
          />
        );
      }}
      initialParams={{
        accountAddress: address,
        orderBy: "created_at",
        orderDirection: "DESC",
        search: "",
        enabled: !!address && tab === "feed",
      }}
      itemsPerPage={10}
      emptyMessage="No feed found matching your criteria."
      className="space-y-4"
    />
    </>
  );
}
