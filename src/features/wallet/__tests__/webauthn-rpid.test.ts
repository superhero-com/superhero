// The WebAuthn RP ID is the custody boundary. These are the CI assertions that
// hold it build-time-pinned (never runtime-derived from the serving host) and
// reproduce the finding that a bundle served from an unexpected host must not
// silently mint host-scoped credentials.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  afterEach, describe, expect, it, vi,
} from 'vitest';
import {
  DEFAULT_RP_ID, RP_ID, pinnedRpId, enrollPrfCredential,
} from '../webauthn';

describe('WebAuthn rpId is build-time pinned (custody boundary)', () => {
  it('the production build value is superhero.com (default when unconfigured)', () => {
    // Branch CI runs with VITE_WEBAUTHN_RP_ID unset, so this asserts the
    // production artifact's rpId — the exact string the requirement pins.
    expect(DEFAULT_RP_ID).toBe('superhero.com');
    expect(RP_ID).toBe('superhero.com');
    expect(pinnedRpId(undefined)).toBe('superhero.com');
    expect(pinnedRpId({})).toBe('superhero.com');
    expect(pinnedRpId({ VITE_WEBAUTHN_RP_ID: '   ' })).toBe('superhero.com');
  });

  it('a non-production build pins its own value (preview/staging/dev)', () => {
    // This is the mechanism a preview build uses so the ceremony stays runnable
    // on its per-PR origin — demonstrated end-to-end by building with the var set.
    expect(pinnedRpId({ VITE_WEBAUTHN_RP_ID: 'pr-42-superhero.stg.service.aepps.com' }))
      .toBe('pr-42-superhero.stg.service.aepps.com');
    expect(pinnedRpId({ VITE_WEBAUTHN_RP_ID: 'localhost' })).toBe('localhost');
  });

  it('CI guard: webauthn.ts never derives the rpId from the runtime host', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/features/wallet/webauthn.ts'), 'utf8');
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, '') // strip block comments
      .replace(/\/\/.*$/gm, ''); // strip line comments
    expect(code).not.toMatch(/window\s*\.\s*location/);
    expect(code).not.toMatch(/location\s*\.\s*hostname/);
    expect(code).not.toMatch(/\.\s*hostname\b/);
  });
});

describe('the finding: a bundle served from an unexpected host', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not mint host-scoped credentials — enroll uses the pinned rpId', async () => {
    // Serve the bundle from a hostile origin. The pinned rpId must ignore it.
    vi.stubGlobal('location', { hostname: 'attacker.example.com', href: 'https://attacker.example.com/' });

    const rawId = new Uint8Array([1, 2, 3, 4]).buffer;
    const prfFirst = new Uint8Array(32).fill(9).buffer;
    const create = vi.fn().mockResolvedValue({
      rawId,
      getClientExtensionResults: () => ({ prf: { enabled: true, results: { first: prfFirst } } }),
    });
    vi.stubGlobal('navigator', { credentials: { create } });

    const { rpId } = await enrollPrfCredential({
      userId: new Uint8Array(16),
      userName: 'superhero',
      prfSalt: new Uint8Array(32).fill(1),
    });

    expect(rpId).toBe('superhero.com');
    expect(create).toHaveBeenCalledTimes(1);
    const passed = create.mock.calls[0][0].publicKey.rp.id;
    expect(passed).toBe('superhero.com');
    expect(passed).not.toBe('attacker.example.com');
  });
});
