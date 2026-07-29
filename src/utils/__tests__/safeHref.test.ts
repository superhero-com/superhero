// The dangerous-scheme literals below (javascript:/data:/vbscript:) are the HARDEN-05 corpus
// this file exists to test — disabling the (correct, in production code) no-script-url lint
// rule for this file only.
/* eslint-disable no-script-url */
import { describe, expect, it } from 'vitest';
import { isSafeHref, safeHref } from '@/utils/safeHref';

describe('safeHref', () => {
  describe('blocks dangerous schemes (HARDEN-05 corpus)', () => {
    const dangerous: Array<[label: string, url: string]> = [
      ['bare javascript:', 'javascript:alert(1)'],
      ['javascript: with payload', 'javascript:alert(document.cookie)'],
      ['mixed-case JavaScript:', 'JaVaScRiPt:alert(1)'],
      ['upper-case JAVASCRIPT:', 'JAVASCRIPT:alert(1)'],
      ['leading whitespace', '   javascript:alert(1)'],
      ['trailing whitespace', 'javascript:alert(1)   '],
      ['embedded tab before colon', 'java\tscript:alert(1)'],
      ['embedded newline before colon', 'java\nscript:alert(1)'],
      ['embedded carriage return', 'java\rscript:alert(1)'],
      ['tab immediately before colon', 'javascript\t:alert(1)'],
      ['tab after colon', 'javascript:\talert(1)'],
      ['data URL with inline HTML/script', 'data:text/html,<script>alert(1)</script>'],
      ['data URL base64-encoded HTML', 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=='],
      ['mixed-case Data:', 'Data:text/html,<script>alert(1)</script>'],
      ['vbscript:', 'vbscript:msgbox(1)'],
      ['mixed-case VBScript:', 'VBScript:msgbox(1)'],
      ['blob:', 'blob:https://example.com/9a1f9e2e-uuid'],
      ['file:', 'file:///etc/passwd'],
      ['ftp:', 'ftp://example.com/file'],
      ['about: scheme', 'about:blank'],
    ];

    it.each(dangerous)('rejects %s (%s)', (_label, url) => {
      expect(safeHref(url)).toBeUndefined();
      expect(isSafeHref(url)).toBe(false);
    });
  });

  describe('allows http(s) and relative URLs', () => {
    const safe: Array<[label: string, url: string]> = [
      ['plain http', 'http://example.com'],
      ['plain https', 'https://example.com/path?a=1#frag'],
      ['upper-case scheme HTTPS://', 'HTTPS://EXAMPLE.COM'],
      ['root-relative path', '/trends/tokens/FOO'],
      ['dot-relative path', './relative/path'],
      ['fragment only', '#section'],
      ['query only', '?query=1'],
    ];

    it.each(safe)('allows %s (%s)', (_label, url) => {
      expect(safeHref(url)).toBe(url);
      expect(isSafeHref(url)).toBe(true);
    });
  });

  describe('opt-in schemes', () => {
    it('rejects mailto: by default', () => {
      expect(safeHref('mailto:test@example.com')).toBeUndefined();
    });

    it('allows mailto: only when explicitly opted in', () => {
      expect(safeHref('mailto:test@example.com', { allowSchemes: ['mailto:'] })).toBe(
        'mailto:test@example.com',
      );
    });

    it('still rejects javascript: even when mailto: is opted in', () => {
      expect(safeHref('javascript:alert(1)', { allowSchemes: ['mailto:'] })).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('rejects null', () => {
      expect(safeHref(null)).toBeUndefined();
    });

    it('rejects undefined', () => {
      expect(safeHref(undefined)).toBeUndefined();
    });

    it('rejects empty string', () => {
      expect(safeHref('')).toBeUndefined();
    });

    it('rejects a whitespace-only string', () => {
      expect(safeHref('   ')).toBeUndefined();
    });

    it('rejects unparseable garbage', () => {
      expect(safeHref('not a url at all, just words')).toBeUndefined();
    });
  });
});
