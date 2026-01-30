import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import bs58 from 'bs58';
import { sha256 as nobleSha256 } from '@noble/hashes/sha2.js';

export const POSTING_PROGRAM_ID = new PublicKey('oDy6iB8tFYqYMnRPpk88PW7Cp2TaqK8qZtK3vhexP3f');
export const MAX_URI_BYTES = 512;
const LEGACY_MAX_URI_BYTES = 200;

export function u64ToLeBytes(value: bigint): Uint8Array {
  const out = new Uint8Array(8);
  const dv = new DataView(out.buffer);
  dv.setBigUint64(0, BigInt.asUintN(64, value), true);
  return out;
}

export async function sha256(data: Uint8Array): Promise<Uint8Array> {
  return nobleSha256(data);
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (let i = 0; i < chunks.length; i += 1) {
    const c = chunks[i];
    out.set(c, o);
    o += c.length;
  }
  return out;
}

export async function derivePostId(author: PublicKey, clientNonce: bigint): Promise<Uint8Array> {
  const prefix = new TextEncoder().encode('posting:v1');
  const bytes = concatBytes([prefix, author.toBytes(), u64ToLeBytes(clientNonce)]);
  return sha256(bytes);
}

export function bytes32ToBase58(bytes: Uint8Array): string {
  return bs58.encode(bytes);
}

export function decodeInstructionDataString(data: string): Uint8Array {
  return bs58.decode(data);
}

export function decodePostInstructionData(data: Uint8Array): {
  uri: string;
  uri_len: number;
  content_hash: Uint8Array;
  client_nonce: bigint;
} {
  const minLenLegacy = 8 + LEGACY_MAX_URI_BYTES + 2 + 32 + 8;
  const minLenCurrent = 8 + MAX_URI_BYTES + 2 + 32 + 8;
  if (data.length < minLenLegacy) throw new Error(`Invalid post ix data length: ${data.length}`);

  const uriBytesLen = data.length >= minLenCurrent ? MAX_URI_BYTES : LEGACY_MAX_URI_BYTES;
  let off = 8;
  const uriBuf = data.slice(off, off + uriBytesLen);
  off += uriBytesLen;
  const dvLen = new DataView(data.buffer, data.byteOffset + off, 2);
  const uriLen = dvLen.getUint16(0, true);
  off += 2;
  const contentHash = data.slice(off, off + 32);
  off += 32;
  const dvNonce = new DataView(data.buffer, data.byteOffset + off, 8);
  const nonce = dvNonce.getBigUint64(0, true);
  const uri = new TextDecoder().decode(uriBuf.slice(0, uriLen));
  return {
    uri, uri_len: uriLen, content_hash: contentHash, client_nonce: nonce,
  };
}

async function instructionDiscriminator(name: string): Promise<Uint8Array> {
  const preimage = new TextEncoder().encode(`global:${name}`);
  return (await sha256(preimage)).slice(0, 8);
}

export async function buildPostInstruction(opts: {
  author: PublicKey;
  uri: string;
  contentHash32: Uint8Array;
  clientNonce: bigint;
}): Promise<TransactionInstruction> {
  const uriBytes = new TextEncoder().encode(opts.uri);
  if (uriBytes.length > MAX_URI_BYTES) throw new Error(`URI too long (${uriBytes.length} > ${MAX_URI_BYTES})`);
  if (opts.contentHash32.length !== 32) throw new Error('contentHash32 must be 32 bytes');

  const disc = await instructionDiscriminator('post');
  const uriFixed = new Uint8Array(MAX_URI_BYTES);
  uriFixed.set(uriBytes);
  const uriLen = new Uint8Array(2);
  new DataView(uriLen.buffer).setUint16(0, uriBytes.length, true);

  const data = concatBytes([
    disc,
    uriFixed,
    uriLen,
    opts.contentHash32,
    u64ToLeBytes(opts.clientNonce),
  ]);

  return new TransactionInstruction({
    programId: POSTING_PROGRAM_ID,
    keys: [{ pubkey: opts.author, isSigner: true, isWritable: true }],
    data,
  });
}
