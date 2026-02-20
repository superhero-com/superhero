import type { PostDto } from '@/api/generated';

export type PostSenderInfo = {
  address?: string | null;
  public_name?: string | null;
  avatarurl?: string | null;
  bio?: string | null;
  display_source?: string | null;
};

export function getPostSender(post: PostDto | null | undefined): PostSenderInfo | null {
  const sender = (post as any)?.sender;
  if (!sender || typeof sender !== 'object') return null;
  return sender as PostSenderInfo;
}

export function getPostSenderAddress(post: PostDto | null | undefined): string {
  const senderAddress = String(getPostSender(post)?.address || '').trim();
  if (senderAddress) return senderAddress;
  return String((post as any)?.sender_address || (post as any)?.senderAddress || '').trim();
}

export function getPostSenderDisplayName(post: PostDto | null | undefined): string {
  return String(getPostSender(post)?.public_name || '').trim();
}

export function getPostSenderAvatarUrl(post: PostDto | null | undefined): string | null {
  const avatarUrl = String(getPostSender(post)?.avatarurl || '').trim();
  return avatarUrl || null;
}
