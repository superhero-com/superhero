import { OpenAPI, PostsService, type PostDto } from "@super/api/generated";
import Feed from "./shared/Feed";
import ClientHomeTop from "./ClientHomeTop";

export const revalidate = 30;
export const dynamic = "force-dynamic";

export default async function SocialHome({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  OpenAPI.BASE = process.env.NEXT_PUBLIC_API_BASE || "https://api.dev.tokensale.org";
  const get = (k: string) => {
    const v = searchParams?.[k];
    return Array.isArray(v) ? v[0] : v || undefined;
  };
  const sortBy = get("sortBy") ?? "created_at";
  const search = get("search") ?? "";
  const filterBy = get("filterBy") ?? "all";
  const page = 1;
  const limit = 10;

  const data = await PostsService.listAll({
    orderBy: sortBy === "hot" ? "total_comments" : "created_at",
    orderDirection: "DESC",
    search,
    limit,
    page,
  });

  const items = (data as unknown as { items?: PostDto[] })?.items ?? [];
  const filtered = filterBy === "withMedia"
    ? items.filter(i => Array.isArray(i.media) && i.media.length > 0)
    : filterBy === "withComments"
      ? items.filter(i => (i.total_comments ?? 0) > 0)
      : items;

  return (
    <div className="w-full">
      <ClientHomeTop sortBy={sortBy} />
      <Feed initialItems={filtered} />
    </div>
  );
}


