// The WebAuthn RP ID is the custody boundary. These are the CI assertions that
// hold it build-time-pinned (never runtime-derived from the serving host) and
// reproduce the finding that a bundle served from an unexpected host must not
// silently mint host-scoped credentials.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
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

  it('CI guard: webauthn.ts is the ONLY place that reads VITE_WEBAUTHN_RP_ID', () => {
    // A second inline `import.meta.env.VITE_WEBAUTHN_RP_ID || 'superhero.com'`
    // is not a harmless duplicate: it keeps defaulting to production on a build
    // that HAS set the var, so that call site fails with a SecurityError — before
    // any OS UI is shown, so it reads as "nothing happened" — while every other
    // ceremony works. usePasskeyConnect shipped exactly that bug. Everything
    // outside webauthn.ts must import the pinned `RP_ID` instead.
    const root = resolve(process.cwd(), 'src');

    // webauthn.ts owns the value; vite-env.d.ts only declares its type; this
    // file names it in fixtures and prose.
    const allowed = [
      join('features', 'wallet', 'webauthn.ts'),
      'vite-env.d.ts',
      join('features', 'wallet', '__tests__', 'webauthn-rpid.test.ts'),
    ];

    const sourceFiles = (dir: string): string[] => readdirSync(dir, { withFileTypes: true })
      .flatMap((entry) => {
        const path = resolve(dir, entry.name);
        if (entry.isDirectory()) return sourceFiles(path);
        return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
      });

    const offenders = sourceFiles(root)
      .map((path) => ({ rel: relative(root, path), path }))
      .filter(({ rel }) => !allowed.includes(rel))
      .filter(({ path }) => {
        const code = readFileSync(path, 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/.*$/gm, '');
        // Match the actual env READ, not mentions of the name — comments
        // pointing at the README are fine and shouldn't fail the build.
        return /import\s*\.\s*meta\s*\.\s*env[\s\S]{0,40}VITE_WEBAUTHN_RP_ID/.test(code)
          || /VITE_WEBAUTHN_RP_ID[\s\S]{0,20}(\]|\})?\s*\|\|/.test(code);
      })
      .map(({ rel }) => rel);

    expect(offenders).toEqual([]);
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
