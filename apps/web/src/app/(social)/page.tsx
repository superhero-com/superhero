import { OpenAPI, PostsService, type PostDto } from "@super/api/generated";
import Feed from "./shared/Feed";
import dynamic from "next/dynamic";
const CreatePost = dynamic(() => import("@super/features/social/components/CreatePost"), { ssr: false });
const SortControls = dynamic(() => import("@super/features/social/components/SortControls"), { ssr: false });

export const revalidate = 30;

export default async function SocialHome({ searchParams }: { searchParams?: { sortBy?: string; search?: string; filterBy?: string } }) {
  OpenAPI.BASE = process.env.NEXT_PUBLIC_API_BASE || "https://api.dev.tokensale.org";
  const sortBy = searchParams?.sortBy ?? "created_at";
  const search = searchParams?.search ?? "";
  const filterBy = searchParams?.filterBy ?? "all";
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
      <div className="hidden md:block">
        {/* Note: CreatePost is a client component that relies on wallet; it will hydrate on client */}
        {/* @ts-expect-error server-to-client boundary */}
        <CreatePost onSuccess={async () => {}} />
        {/* @ts-expect-error server-to-client boundary */}
        <SortControls sortBy={sortBy} onSortChange={() => {}} />
      </div>
      <Feed initialItems={filtered} />
    </div>
  );
}


