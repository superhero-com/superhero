import { PostsService } from "@/api/generated/services/PostsService";
import {
  DataTable,
  DataTableResponse,
} from "@/features/shared/components/DataTable";
import FeedItem from "@/features/social/components/FeedItem";
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
      renderRow={({ item, index }) => (
        <FeedItem
          key={item.id}
          item={item}
          commentCount={item.total_comments ?? 0}
          onItemClick={(id: string) => navigate(`/post/${id}`)}
        />
      )}
      initialParams={{
        accountAddress: address,
        limit: 100,
        page: 1,
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
