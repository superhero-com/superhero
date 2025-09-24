import { OpenAPI, PostsService, type PostDto } from "@super/api/generated";
import Feed from "../../(social)/shared/Feed";

export const revalidate = 30;

export default async function UserFeedPage({ params }: { params: { address: string } }) {
  OpenAPI.BASE = process.env.NEXT_PUBLIC_API_BASE || "https://api.dev.tokensale.org";
  const data = await PostsService.listAll({
    accountAddress: params.address,
    orderBy: "created_at",
    orderDirection: "DESC",
    page: 1,
    limit: 50,
  });
  const items = (data as unknown as { items?: PostDto[] })?.items ?? [];
  return <Feed initialItems={items} />;
}


