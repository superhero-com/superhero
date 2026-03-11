import { PostDto } from '../../../api/generated';

// Find immediate parent id from media/topics/tx_args and normalize to *_v3
export function extractParentId(post: PostDto | any): string | null {
  const extract = (value: unknown): string | null => {
    if (!value) return null;
    const asString = String(value);
    const m = asString.match(/comment[:/]([^\s,;]+)/i);
    const id = m?.[1] || (asString.startsWith('comment:') ? asString.split(':')[1] : null);
    if (!id) return null;
    return id.endsWith('_v3') ? id : `${id}_v3`;
  };

  // media
  if (Array.isArray(post?.media)) {
    const found = post.media.map((m: unknown) => extract(m)).find(Boolean);
    if (found) return found;
  }
  // tx_args recursive scan
  const scan = (node: any): string | null => {
    if (node == null) return null;
    if (typeof node === 'string') return extract(node);
    if (Array.isArray(node)) {
      const found = node.map((x) => scan(x)).find(Boolean);
      return found || null;
    }
    if (typeof node === 'object') {
      const found = Object.values(node).map((v) => scan(v)).find(Boolean);
      return found || null;
    }
    return null;
  };

  return scan(post?.tx_args);
}
