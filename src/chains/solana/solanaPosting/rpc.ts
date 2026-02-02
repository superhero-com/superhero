import type { Connection } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import type { SocialPost } from '../social/types';
import {
  POSTING_PROGRAM_ID,
  bytes32ToBase58,
  decodePostInstructionData,
  derivePostId,
  sha256,
} from './program';
import {
  fetchOffchainJson,
  normalizeOffchainContent,
  parseInlineContentFromUri,
  verifyContentHash,
} from './content';

type ParsedPostingInstruction = {
  signature: string;
  author: string;
  blockTime?: number | null;
  uri: string;
  contentHash32: Uint8Array;
  clientNonce: bigint;
};

function getAccountKeysFromMessage(msg: any): string[] {
  const keys = msg?.accountKeys || msg?.staticAccountKeys || [];
  return (keys as any[]).map((k) => {
    if (typeof k === 'string') return k;
    if (k?.pubkey) return typeof k.pubkey === 'string' ? k.pubkey : k.pubkey.toBase58();
    if (typeof k?.toBase58 === 'function') return k.toBase58();
    return String(k);
  });
}

function decodeInstructionDataAny(data: unknown): Uint8Array {
  if (!data) throw new Error('Missing instruction data');
  if (typeof data === 'string') return bs58.decode(data);
  if (data instanceof Uint8Array) return data;
  if (typeof (data as any)?.length === 'number' && typeof (data as any)[0] === 'number') {
    return new Uint8Array(data as any);
  }
  throw new Error(`Unsupported instruction data type: ${typeof data}`);
}

function findPostingInstruction(tx: any): { authorKey: string; dataBytes: Uint8Array } | null {
  const msg = tx?.transaction?.message;
  if (!msg) return null;
  const accountKeys = getAccountKeysFromMessage(msg);

  const rawInstructions: any[] = Array.isArray(msg.instructions) ? msg.instructions : [];
  for (let i = 0; i < rawInstructions.length; i += 1) {
    const ix = rawInstructions[i];
    const programId = ix?.programId;
    if (programId && String(programId) === POSTING_PROGRAM_ID.toBase58()) {
      const accounts: string[] = Array.isArray(ix.accounts) ? ix.accounts : [];
      const authorKey = accounts[0] || '';
      try {
        const dataBytes = decodeInstructionDataAny(ix.data);
        if (authorKey) return { authorKey, dataBytes };
      } catch {
        // ignore
      }
    }
  }

  const compiled: any[] = Array.isArray(msg.compiledInstructions) ? msg.compiledInstructions : [];
  for (let i = 0; i < compiled.length; i += 1) {
    const ix = compiled[i];
    const programIdIndex = ix?.programIdIndex;
    const programId = typeof programIdIndex === 'number' ? accountKeys[programIdIndex] : undefined;
    if (programId && programId === POSTING_PROGRAM_ID.toBase58()) {
      let accountsIdx: number[] = [];
      if (Array.isArray(ix.accounts)) accountsIdx = ix.accounts;
      else if (Array.isArray(ix.accountKeyIndexes)) accountsIdx = ix.accountKeyIndexes;
      const authorKey = typeof accountsIdx[0] === 'number' ? accountKeys[accountsIdx[0]] : '';
      try {
        const dataBytes = decodeInstructionDataAny(ix.data);
        if (authorKey) return { authorKey, dataBytes };
      } catch {
        // ignore
      }
    }
  }

  return null;
}

async function parsePostingTx(connection: Connection, signature: string): Promise<ParsedPostingInstruction | null> {
  const tx = await connection.getTransaction(signature, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 });
  if (!tx) return null;
  if ((tx as any).meta?.err) return null;

  const found = findPostingInstruction(tx as any);
  if (!found) return null;

  const decoded = decodePostInstructionData(found.dataBytes);
  return {
    signature,
    author: found.authorKey,
    blockTime: (tx as any).blockTime ?? null,
    uri: decoded.uri,
    contentHash32: decoded.content_hash,
    clientNonce: decoded.client_nonce,
  };
}

export async function getPostBySignature(connection: Connection, signature: string): Promise<SocialPost> {
  const parsed = await parsePostingTx(connection, signature);
  if (!parsed) throw new Error('Post not found (or not a posting tx)');

  const authorPk = new PublicKey(parsed.author);
  const postIdBytes = await derivePostId(authorPk, parsed.clientNonce);
  const postId = bytes32ToBase58(postIdBytes);
  const createdAt = parsed.blockTime ? new Date(parsed.blockTime * 1000).toISOString() : new Date().toISOString();

  const isHttp = /^https?:\/\//i.test(parsed.uri);
  const { json, rawBytes } = isHttp ? await fetchOffchainJson(parsed.uri) : parseInlineContentFromUri(parsed.uri);
  const off = normalizeOffchainContent(json);

  const isValidHash = isHttp
    ? await verifyContentHash(rawBytes, parsed.contentHash32).catch(() => false)
    : await sha256(rawBytes).then((h) => {
      for (let i = 0; i < 32; i += 1) if (h[i] !== parsed.contentHash32[i]) return false;
      return true;
    }).catch(() => false);

  return {
    id: parsed.signature,
    slug: parsed.signature,
    sender_address: parsed.author,
    content: off.text || '',
    media: off.media || [],
    created_at: createdAt,
    tx_hash: parsed.signature,
    total_comments: 0,
    post_id: postId,
    content_hash: bytes32ToBase58(parsed.contentHash32),
    client_nonce: parsed.clientNonce.toString(),
    uri: parsed.uri,
    type: off.type,
    parent: off.parent,
    ...(isValidHash ? {} : {}),
  };
}

export async function listPostsPage(
  connection: Connection,
  {
    limit = 20,
    before,
  }: { limit?: number; before?: string } = {},
): Promise<{ items: SocialPost[]; nextBefore?: string }> {
  const sigInfos = await connection.getSignaturesForAddress(POSTING_PROGRAM_ID, { limit, before }, 'confirmed');
  const sigs = sigInfos.map((s) => s.signature);
  const nextBefore = sigs.length > 0 ? sigs[sigs.length - 1] : undefined;

  const items: SocialPost[] = [];
  for (let i = 0; i < sigs.length; i += 1) {
    const sig = sigs[i];
    try {
      // eslint-disable-next-line no-await-in-loop
      const post = await getPostBySignature(connection, sig);
      items.push(post);
    } catch {
      // ignore
    }
  }
  return { items, nextBefore };
}

export async function listRepliesByParentPostId(
  connection: Connection,
  parentPostId: string,
  { limit = 200, before }: { limit?: number; before?: string } = {},
): Promise<{ items: SocialPost[]; nextBefore?: string }> {
  const sigInfos = await connection.getSignaturesForAddress(POSTING_PROGRAM_ID, { limit, before }, 'confirmed');
  const sigs = sigInfos.map((s) => s.signature);
  const nextBefore = sigs.length > 0 ? sigs[sigs.length - 1] : undefined;

  const items: SocialPost[] = [];
  for (let i = 0; i < sigs.length; i += 1) {
    const sig = sigs[i];
    try {
      // eslint-disable-next-line no-await-in-loop
      const post = await getPostBySignature(connection, sig);
      if (post.type === 'comment' && post.parent === parentPostId) items.push(post);
    } catch {
      // ignore
    }
  }

  items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  return { items, nextBefore };
}

export async function findPostSignatureByPostId(
  connection: Connection,
  postId: string,
  { limit = 200 } = {},
): Promise<{ signature: string } | null> {
  const sigInfos = await connection.getSignaturesForAddress(POSTING_PROGRAM_ID, { limit }, 'confirmed');
  for (let i = 0; i < sigInfos.length; i += 1) {
    const sig = sigInfos[i]?.signature;
    if (!sig) continue;
    try {
      // eslint-disable-next-line no-await-in-loop
      const post = await getPostBySignature(connection, sig);
      if (post.post_id === postId) return { signature: sig };
    } catch {
      // ignore
    }
  }
  return null;
}
