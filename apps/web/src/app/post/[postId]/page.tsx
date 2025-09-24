import { OpenAPI, PostsService } from "@super/api/generated";
import PostClient from "./post-client";

export const revalidate = 30;

export default async function PostDetailPage({ params }: { params: { postId: string } }) {
  OpenAPI.BASE = process.env.NEXT_PUBLIC_API_BASE || "https://api.dev.tokensale.org";
  const postData = await PostsService.getById({ id: params.postId });
  return <PostClient postData={postData} />;
}


