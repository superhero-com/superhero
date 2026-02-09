import { PostsService, type PostDto } from '@/api/generated';

function ensureV3(id: string): string {
  return id.endsWith('_v3') ? id : `${id}_v3`;
}

function isLikelyNumericId(key: string): boolean {
  return /^\d+$/.test(key);
}

/**
 * Resolve a post by slug or id.
 * Strategy:
 * 1) Try direct GET /api/posts/{key}
 * 2) If key looks like numeric id or ends with _v3 → try GET /api/posts/{id_v3}
 * 3) Fallback: search listAll({ search: key, limit: 1, page: 1 }) and then fetch by returned id
 */
export async function resolvePostByKey(key: string): Promise<PostDto> {
  const normalized = String(key || '').trim();
  if (!normalized) throw new Error('Missing post identifier');
  // 1) Direct
  try {
    return (await PostsService.getById({ id: normalized })) as unknown as PostDto;
  } catch {}
  // 2) Try with _v3 for numeric ids or keys that already look like ids
  if (isLikelyNumericId(normalized) || normalized.endsWith('_v3')) {
    try {
      return (await PostsService.getById({ id: ensureV3(normalized) })) as unknown as PostDto;
    } catch {}
  }
  // 3) Fallback: search and refetch by id
  try {
    const res: any = (await PostsService.listAll({
      search: normalized,
      limit: 1,
      page: 1,
      orderBy: 'created_at',
      orderDirection: 'DESC',
    })) as any;
    const first = Array.isArray(res?.items) ? res.items[0] : null;
    if (first?.id) {
      return (await PostsService.getById({ id: String(first.id) })) as unknown as PostDto;
    }
  } catch {}
  throw new Error('Post not found');
}
