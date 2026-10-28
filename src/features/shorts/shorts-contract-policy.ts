import { Encoding, isAddressValid } from '@aeternity/aepp-sdk';

export interface ShortsContractPolicy {
  version: string;
  operator: string;
  treasury: string | null;
  likeFeeAetto: string;
  treasuryBps: number;
  maxVideoBytes: number;
  maxCommentChars: number;
  maxCommentBytes: number;
  commentCooldown: number;
  publishingEnabled: boolean;
  likesEnabled: boolean;
  commentsEnabled: boolean;
}

const integer = (value: unknown, maximum?: bigint) => {
  const text = String(value);
  if (!/^(0|[1-9]\d{0,77})$/.test(text) || (maximum !== undefined && BigInt(text) > maximum)) throw new Error('Invalid Shorts contract policy');
  return text;
};

/** Validate mutable on-chain policy separately from the immutable release identity. */
export function shortsContractPolicy(value: unknown, schema: 1 | 2): ShortsContractPolicy {
  if (!Array.isArray(value) || value.length !== (schema === 2 ? 2 : 4)) throw new Error('Invalid Shorts contract configuration');
  const cfg = schema === 2 ? value[0] : {
    operator: value[0],
    treasury: value[1],
    like_fee: value[2],
    treasury_bps: value[3],
    max_video_bytes: 100000000,
    max_comment_chars: 280,
    max_comment_bytes: 1120,
    comment_cooldown: 0,
    publishing_enabled: true,
    likes_enabled: true,
    comments_enabled: false,
  };
  if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) throw new Error('Invalid Shorts contract policy');
  const economics = ['treasury', 'like_fee', 'treasury_bps'];
  const present = economics.filter((key) => Object.hasOwn(cfg, key));
  const compact = schema === 2 && present.length === 0;
  const fields = ['operator', 'max_video_bytes', 'max_comment_chars', 'max_comment_bytes',
    'comment_cooldown', 'publishing_enabled', 'likes_enabled', 'comments_enabled', ...(compact ? [] : economics)];
  if ((!compact && present.length !== economics.length)
    || Object.keys(cfg).length !== fields.length || Object.keys(cfg).some((key) => !fields.includes(key))
    || !isAddressValid(cfg.operator, Encoding.AccountAddress)
    || (!compact && !isAddressValid(cfg.treasury, Encoding.AccountAddress))
    || ['publishing_enabled', 'likes_enabled', 'comments_enabled'].some((key) => typeof cfg[key] !== 'boolean')) throw new Error('Invalid Shorts contract policy');
  const policy = {
    version: integer(schema === 2 ? value[1] : 0),
    operator: cfg.operator,
    treasury: compact ? null : cfg.treasury,
    likeFeeAetto: compact ? '0' : integer(cfg.like_fee),
    treasuryBps: compact ? 0 : Number(integer(cfg.treasury_bps, 10000n)),
    maxVideoBytes: Number(integer(cfg.max_video_bytes, 100000000n)),
    maxCommentChars: Number(integer(cfg.max_comment_chars, 280n)),
    maxCommentBytes: Number(integer(cfg.max_comment_bytes, 1120n)),
    commentCooldown: Number(integer(cfg.comment_cooldown, 10000n)),
    publishingEnabled: cfg.publishing_enabled,
    likesEnabled: cfg.likes_enabled,
    commentsEnabled: cfg.comments_enabled,
  };
  if ((schema === 1 && BigInt(policy.likeFeeAetto) === 0n) || !policy.maxVideoBytes || !policy.maxCommentChars || !policy.maxCommentBytes) throw new Error('Invalid Shorts contract limits');
  return policy;
}
