import { PostsService } from "@/api/generated/services/PostsService";
import {
  DataTable,
  DataTableResponse,
} from "@/features/shared/components/DataTable";
import ReplyToFeedItem from "@/features/social/components/ReplyToFeedItem";
import TokenCreatedFeedItem from "@/features/social/components/TokenCreatedFeedItem";
import { PostApiResponse } from "@/features/social/types";
import { useNavigate } from "react-router-dom";

interface AccountFeedProps {
  address: string;
  tab: string;
}

export default function AccountFeed({ address, tab }: AccountFeedProps) {
  const navigate = useNavigate();

  const fetchFeed = async (params: any) => {
    const response = (await PostsService.listAll({
      ...params,
    })) as unknown as Promise<PostApiResponse>;
    return response as unknown as DataTableResponse<any>;
  };

  return (
    <DataTable
      queryFn={fetchFeed}
      renderRow={({ item, index }) => {
        const postId = item.id;
        const isTokenCreated = String(postId).startsWith("token-created:");
        if (isTokenCreated) {
          return (
            <TokenCreatedFeedItem
              key={postId}
              item={item}
              onOpenPost={(id: string) => navigate(`/trends/tokens/${String(id)}`)}
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
  );
}
