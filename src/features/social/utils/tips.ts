export function buildTipPostPayload(postId: string): string {
  const normalized = String(postId).endsWith('_v3') ? String(postId) : `${postId}_v3`;
  return `TIP_POST:${normalized}`;
}


