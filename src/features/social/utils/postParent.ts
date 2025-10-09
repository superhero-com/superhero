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
    for (const m of post.media) {
      const got = extract(m);
      if (got) return got;
    }
  }
  // topics
  if (Array.isArray(post?.topics)) {
    for (const t of post.topics) {
      const got = extract(t);
      if (got) return got;
    }
  }
  // tx_args recursive scan
  const scan = (node: any): string | null => {
    if (node == null) return null;
    if (typeof node === 'string') return extract(node);
    if (Array.isArray(node)) {
      for (const x of node) {
        const got = scan(x);
        if (got) return got;
      }
    } else if (typeof node === 'object') {
      for (const v of Object.values(node)) {
        const got = scan(v);
        if (got) return got;
      }
    }
    return null;
  };

  return scan(post?.tx_args);
}


