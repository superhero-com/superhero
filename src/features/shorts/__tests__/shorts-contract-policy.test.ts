import { expect, it } from 'vitest';
import { shortsContractPolicy } from '../shorts-contract-policy';
import vector from './shorts-release-vector.fixture.json';

const compact = {
  operator: vector.release.operator,
  max_video_bytes: 100000000n,
  max_comment_chars: 280n,
  max_comment_bytes: 1120n,
  comment_cooldown: 1n,
  publishing_enabled: true,
  likes_enabled: true,
  comments_enabled: true,
};
const economics = { treasury: vector.release.treasury, like_fee: 100000000000000000n, treasury_bps: 2000n };

it('decodes the free contract configuration without creating a treasury recipient', () => {
  expect(shortsContractPolicy([compact, 3n], 2)).toMatchObject({
    version: '3',
    operator: compact.operator,
    treasury: null,
    likeFeeAetto: '0',
    treasuryBps: 0,
    maxVideoBytes: 100000000,
    maxCommentChars: 280,
    maxCommentBytes: 1120,
    commentCooldown: 1,
    publishingEnabled: true,
    likesEnabled: true,
    commentsEnabled: true,
  });
});

it('preserves historical paid configuration for reward verification', () => {
  expect(shortsContractPolicy([{ ...compact, ...economics }, 2n], 2)).toMatchObject({
    version: '2', treasury: economics.treasury, likeFeeAetto: '100000000000000000', treasuryBps: 2000,
  });
  expect(shortsContractPolicy([compact.operator, economics.treasury, economics.like_fee, 2000n], 1)).toMatchObject({
    treasury: economics.treasury, likeFeeAetto: '100000000000000000', commentsEnabled: false,
  });
});

it.each(Object.keys(economics))('rejects a partially removed economics record: %s', (key) => {
  const partial: Record<string, unknown> = { ...compact, ...economics };
  delete partial[key];
  expect(() => shortsContractPolicy([partial, 0n], 2)).toThrow();
  expect(() => shortsContractPolicy([{ ...compact, [key]: economics[key as keyof typeof economics] }, 0n], 2)).toThrow();
});

it.each([
  { treasury: null, like_fee: 0n, treasury_bps: 0n },
  { unknown: true }, { likes_enabled: 'true' }, { max_comment_bytes: 1121n }, { operator: 'ak_invalid' },
])('rejects malformed compact policy instead of silently supplying defaults', (change) => {
  expect(() => shortsContractPolicy([{ ...compact, ...change }, 0n], 2)).toThrow();
});
