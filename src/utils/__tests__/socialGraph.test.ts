import { describe, expect, it } from 'vitest';
import { ApiError } from '../../api/generated';
import {
  classifySocialGraphError,
  extractSocialGraphCode,
  SILENT_RECONCILE_CODES,
} from '../socialGraph';

/**
 * The abort code reaches the client two ways: the advisory precheck throws an
 * `ApiError` whose body carries `error`/`message`, and a signed transaction that
 * still races the chain reverts with the `require(...)` reason in its message.
 * Both must map to the same behaviour, and nothing raw may reach the user.
 */
function apiError(status: number, code: string): ApiError {
  return new ApiError(
    { method: 'POST', url: '/api/social-graph/precheck' } as any,
    {
      url: '/api/social-graph/precheck', ok: false, status, statusText: '', body: { statusCode: status, error: code, message: code },
    },
    code,
  );
}

describe('extractSocialGraphCode', () => {
  it('reads the code from a precheck ApiError body', () => {
    expect(extractSocialGraphCode(apiError(409, 'ALREADY_FOLLOWING'))).toBe('ALREADY_FOLLOWING');
    expect(extractSocialGraphCode(apiError(403, 'BLOCKED'))).toBe('BLOCKED');
  });

  it('reads the code from an on-chain revert message', () => {
    expect(
      extractSocialGraphCode(new Error('Invocation failed: "MAX_FOLLOWING_REACHED"')),
    ).toBe('MAX_FOLLOWING_REACHED');
  });

  it('does not let BLOCKED shadow BLOCKED_BY_SELF in a revert string', () => {
    expect(
      extractSocialGraphCode(new Error('transaction aborted with: BLOCKED_BY_SELF')),
    ).toBe('BLOCKED_BY_SELF');
  });

  it('returns null when no known code is present', () => {
    expect(extractSocialGraphCode(new Error('network timeout'))).toBeNull();
    expect(extractSocialGraphCode(undefined)).toBeNull();
  });
});

describe('classifySocialGraphError — bucket A, reconcile silently', () => {
  it.each([...SILENT_RECONCILE_CODES])('treats %s as silent', (code) => {
    const info = classifySocialGraphError(apiError(409, code));
    expect(info.kind).toBe('silent');
  });
});

describe('classifySocialGraphError — bucket B, surface actionable copy', () => {
  it('BLOCKED is neutral with no reason', () => {
    const info = classifySocialGraphError(apiError(403, 'BLOCKED'));
    expect(info).toMatchObject({ kind: 'surface', messageKey: 'socialGraph.errors.blocked' });
    expect((info as any).offerUnblock).toBeUndefined();
  });

  it('BLOCKED_BY_SELF offers the inline unblock affordance', () => {
    const info = classifySocialGraphError(apiError(409, 'BLOCKED_BY_SELF'));
    expect(info).toMatchObject({
      kind: 'surface',
      messageKey: 'socialGraph.errors.blockedBySelf',
      offerUnblock: true,
    });
  });

  it('MAX_FOLLOWING_REACHED states the real cap from config', () => {
    const info = classifySocialGraphError(apiError(409, 'MAX_FOLLOWING_REACHED'), {
      max_following: 10000,
    });
    expect(info).toMatchObject({
      kind: 'surface',
      messageKey: 'socialGraph.errors.maxFollowing',
      values: { max: '10,000' },
    });
  });

  it('MAX_BLOCKED_REACHED states the real block cap', () => {
    const info = classifySocialGraphError(apiError(409, 'MAX_BLOCKED_REACHED'), {
      max_blocked: 10000,
    });
    expect(info).toMatchObject({ messageKey: 'socialGraph.errors.maxBlocked', values: { max: '10,000' } });
  });

  it('FOLLOW_COOLDOWN is mapped, never left to fall through', () => {
    const info = classifySocialGraphError(apiError(429, 'FOLLOW_COOLDOWN'));
    expect(info).toMatchObject({ kind: 'surface', messageKey: 'socialGraph.errors.cooldown' });
  });

  it('an unknown error falls back to generic copy, never the raw error', () => {
    const info = classifySocialGraphError(new Error('ECONNRESET'));
    expect(info).toEqual({ kind: 'surface', code: null, messageKey: 'socialGraph.errors.generic' });
  });
});
